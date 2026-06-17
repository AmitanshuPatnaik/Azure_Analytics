import os
import json
from models.handle_logging import get_logging_conf
logging = get_logging_conf()
import hashlib
import time
import threading
from datetime import datetime, timezone
from azure.storage.blob import BlobServiceClient

logger = logging.getLogger(__name__)


_CONFIG_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "config.json")
try:
    with open(_CONFIG_PATH, "r") as f:
        _config = json.load(f)
except Exception:
    _config = {}

CONNECTION_STRING = _config.get("AZURE_STORAGE_CONNECTION_STRING", "")
CONTAINER_NAME = "azure-cost-cache"

# Create a local cache folder inside the backend workspace directory
LOCAL_CACHE_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "cache")
try:
    os.makedirs(LOCAL_CACHE_DIR, exist_ok=True)
except Exception as exc:
    logger.warning("[AzureCache] Failed to create local cache dir %s: %s", LOCAL_CACHE_DIR, exc)

_cache_lock = threading.RLock()

_container_client = None

def get_blob_container():
    global _container_client
    if _container_client is not None:
        return _container_client
    if not CONNECTION_STRING:
        logger.warning("[AzureCache] Shared caching disabled: AZURE_STORAGE_CONNECTION_STRING is missing.")
        return None
    try:
        service_client = BlobServiceClient.from_connection_string(CONNECTION_STRING)
        container_client = service_client.get_container_client(CONTAINER_NAME)
        if not container_client.exists():
            container_client.create_container()
            logger.info("[AzureCache] Created Azure Blob container: %s", CONTAINER_NAME)
        _container_client = container_client
        return _container_client
    except Exception as exc:
        logger.warning("[AzureCache] Shared caching disabled: failed to init Azure Blob client: %s", exc)
        return None



def get_cache_key(prefix: str, identifier: str, payload: dict | None = None) -> str:
    clean_id = str(identifier).strip().replace("/", "_").replace("\\", "_")
    if payload:
        # Sort keys to ensure payload hashes are identical for identical queries
        payload_str = json.dumps(payload, sort_keys=True)
        payload_hash = hashlib.sha256(payload_str.encode("utf-8")).hexdigest()[:16]
        return f"{prefix}_{clean_id}_{payload_hash}"
    return f"{prefix}_{clean_id}"


def determine_cost_query_ttl(payload: dict) -> int:
    timeframe = payload.get("timeframe")
    if timeframe == "Custom":
        time_period = payload.get("timePeriod", {})
        to_date_str = time_period.get("to")
        if to_date_str:
            if "T" in to_date_str:
                to_date_str = to_date_str.split("T")[0]
            try:
                to_date = datetime.strptime(to_date_str, "%Y-%m-%d").date()
                today_utc = datetime.now(timezone.utc).date()
                # If end date is strictly before today, it's historical
                if to_date < today_utc:
                    logger.debug("[AzureCache] Custom query end date %s is in the past. Setting TTL = 7 Days", to_date)
                    return 604800  # 7 days
            except Exception:
                pass
    elif timeframe in ("MonthToDate", "YearToDate"):
        return 7200  # 2 hours
    
    return 7200  # Default 2 hours


def _read_cache_entry(key: str) -> dict | None:
    local_path = os.path.join(LOCAL_CACHE_DIR, f"{key}.json")
    
    # 1. Try Local File Cache
    if os.path.exists(local_path):
        try:
            with open(local_path, "r", encoding="utf-8") as f:
                entry = json.load(f)
                if isinstance(entry, dict) and "data" in entry:
                    logger.debug("[AzureCache] Local cache hit for key: %s", key)
                    return entry
        except Exception as exc:
            logger.warning("[AzureCache] Error reading local file cache: %s", exc)

    # 2. Try Shared Azure Blob Storage Cache
    container = get_blob_container()
    if container:
        try:
            blob_client = container.get_blob_client(f"{key}.json")
            if blob_client.exists():
                content = blob_client.download_blob().readall().decode("utf-8")
                entry = json.loads(content)
                if isinstance(entry, dict) and "data" in entry:
                    logger.info("[AzureCache] Shared Blob cache hit for key: %s", key)
                    # Sync to local cache so next reads are instant
                    try:
                        with open(local_path, "w", encoding="utf-8") as f:
                            json.dump(entry, f)
                    except Exception:
                        pass
                    return entry
        except Exception as exc:
            logger.warning("[AzureCache] Error reading from Azure Blob cache: %s", exc)

    return None


def _write_cache_entry(key: str, data: dict, ttl: int) -> None:
    now = time.time()
    entry = {
        "fetched_at": now,
        "expires_at": now + ttl,
        "data": data
    }

    # 1. Write to Local File Cache
    local_path = os.path.join(LOCAL_CACHE_DIR, f"{key}.json")
    try:
        with open(local_path, "w", encoding="utf-8") as f:
            json.dump(entry, f, indent=2)
        logger.debug("[AzureCache] Wrote local cache for key: %s (TTL=%ds)", key, ttl)
    except Exception as exc:
        logger.warning("[AzureCache] Failed to write local cache: %s", exc)

    # 2. Write to Shared Azure Blob Storage Cache
    container = get_blob_container()
    if container:
        try:
            blob_client = container.get_blob_client(f"{key}.json")
            content = json.dumps(entry)
            blob_client.upload_blob(content, overwrite=True)
            logger.info("[AzureCache] Wrote shared Azure Blob cache for key: %s (TTL=%ds)", key, ttl)
        except Exception as exc:
            logger.warning("[AzureCache] Failed to upload to Azure Blob cache: %s", exc)


def get_cached_azure_data(key: str, fetch_fn, ttl: int) -> dict:
    with _cache_lock:
        entry = _read_cache_entry(key)
        now = time.time()

        if entry is not None:
            expires_at = entry.get("expires_at", 0)
            if now < expires_at:
                logger.info("[AzureCache] Serving fresh cache for key: %s (expires in %ds)", key, int(expires_at - now))
                return entry["data"]
            else:
                logger.info("[AzureCache] Cache expired for key: %s. Will attempt live fetch...", key)

        # Cache is missing or expired -> attempt live fetch
        try:
            live_data = fetch_fn()
            
            # Check for API query success
            is_success = False
            if isinstance(live_data, dict):
                # Cost Management API query success metrics
                if live_data.get("success") is True or "properties" in live_data:
                    is_success = True
                # Budgets / Subscriptions listing endpoint success criteria
                elif "budgets" in live_data and live_data.get("success") is True:
                    is_success = True
                elif "subscriptions" in live_data and live_data.get("success") is True:
                    is_success = True

            if is_success:
                _write_cache_entry(key, live_data, ttl)
                return live_data
            else:
                status_code = live_data.get("status_code", "unknown") if isinstance(live_data, dict) else "unknown"
                logger.warning("[AzureCache] Live fetch returned unsuccessful payload (status=%s) for key: %s", status_code, key)
                
                # Check if we have stale/expired cache data as a fallback loophole
                if entry is not None:
                    logger.warning("[AzureCache] LOOPHOLE TRIGGERED: Serving expired/stale cache data for key: %s", key)
                    stale_data = dict(entry["data"])
                    stale_data["is_stale"] = True
                    stale_data["stale_reason"] = f"Azure returned failure/429 (status={status_code}), serving cached data."
                    return stale_data
                
                return live_data

        except Exception as exc:
            logger.error("[AzureCache] Exception during live fetch for key %s: %s", key, exc)
            if entry is not None:
                logger.warning("[AzureCache] LOOPHOLE TRIGGERED: Exception encountered. Serving expired/stale cache data for key: %s", key)
                stale_data = dict(entry["data"])
                stale_data["is_stale"] = True
                stale_data["stale_reason"] = f"Exception during fetch: {exc}, serving cached data."
                return stale_data
            raise exc