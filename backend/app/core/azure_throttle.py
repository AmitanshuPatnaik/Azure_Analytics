"""
azure_throttle.py
─────────────────
Global concurrency limiter and TTL response cache for Azure Cost Management API.

Why this exists
───────────────
Azure Cost Management enforces a low rate limit per subscription (roughly
5-10 concurrent queries per minute per service-principal). When the browser
fires 3 parallel requests (daily-range + top-resources + services) while the
background SyncWorker is also running, all 6+ threads compete for the same
quota → every call gets a 429.

This module provides two independent guards:

1. _AzureSemaphore
   A thread-safe counting semaphore that limits the total number of
   in-flight Azure Cost Management API requests to MAX_CONCURRENT (=2).
   Any additional thread blocks until a slot opens, rather than racing
   and getting rate-limited.

2. _TtlCache
   A per-subscription, per-date-range short-lived response cache (TTL = 5 min).
   If the same (sub_id, from, to, query_type) was successfully fetched within
   the last 5 minutes, we return the cached result without touching Azure.
   This guarantees that even when multiple browser tabs or laptop restarts
   trigger "Fetch Data", Azure only sees one real request per 5 minutes.

Neither class changes any UI behaviour or API contract.
"""

import threading
import time
import logging

logger = logging.getLogger(__name__)

# ── Tunables ────────────────────────────────────────────────────────────────
MAX_CONCURRENT: int = 2      # max live Azure Cost API threads at once
TTL_SECONDS: int    = 300    # 5-minute success cache for date-range results
TOKEN_TTL: int      = 3300   # 55-minute token cache (tokens last 60 min)


# ─────────────────────────────────────────────────────────────────────────── #
#  1. Global concurrency semaphore                                            #
# ─────────────────────────────────────────────────────────────────────────── #

class _AzureSemaphore:
    """
    Counting semaphore that serialises Azure Cost Management API calls so
    at most MAX_CONCURRENT threads run simultaneously.
    """

    def __init__(self, limit: int = MAX_CONCURRENT):
        self._sem = threading.Semaphore(limit)
        self._lock = threading.Lock()
        self._active = 0

    def __enter__(self):
        self._sem.acquire()
        with self._lock:
            self._active += 1
        return self

    def __exit__(self, *_):
        with self._lock:
            self._active -= 1
        self._sem.release()

    @property
    def active_count(self) -> int:
        with self._lock:
            return self._active


azure_semaphore = _AzureSemaphore()


# ─────────────────────────────────────────────────────────────────────────── #
#  2. Short-TTL response cache for date-range queries                         #
# ─────────────────────────────────────────────────────────────────────────── #

class _TtlCache:
    """
    Thread-safe in-memory cache with per-entry TTL expiry.
    Only used for date-range cost results (daily-range, top-resources, services).
    Entries expire after TTL_SECONDS so stale data is never served for long.
    """

    def __init__(self, ttl: int = TTL_SECONDS):
        self._ttl = ttl
        self._lock = threading.RLock()
        self._store: dict[str, tuple[float, object]] = {}  # key → (expires_at, value)

    def _prune(self):
        """Remove expired entries (called lazily on every read/write)."""
        now = time.monotonic()
        expired = [k for k, (exp, _) in self._store.items() if now >= exp]
        for k in expired:
            del self._store[k]

    def get(self, key: str):
        with self._lock:
            self._prune()
            entry = self._store.get(key)
            if entry is None:
                return None
            exp, val = entry
            if time.monotonic() >= exp:
                del self._store[key]
                return None
            return val

    def set(self, key: str, value) -> None:
        with self._lock:
            self._prune()
            self._store[key] = (time.monotonic() + self._ttl, value)
            logger.debug("[TtlCache] set key=%r (expires in %ds)", key, self._ttl)

    def has(self, key: str) -> bool:
        return self.get(key) is not None

    def stats(self) -> dict:
        with self._lock:
            self._prune()
            return {"entries": len(self._store), "ttl_seconds": self._ttl}


# Singleton instances
range_cache = _TtlCache(ttl=TTL_SECONDS)


# ─────────────────────────────────────────────────────────────────────────── #
#  3. Token cache (per service-principal)                                     #
# ─────────────────────────────────────────────────────────────────────────── #

class _TokenCache:
    """
    Caches Azure AD OAuth tokens per (tenant_id, client_id) pair.
    Tokens are valid for 60 minutes; we refresh 5 minutes early.
    Without this, each Azure Cost API call (and each concurrent thread)
    would hammer login.microsoftonline.com — which has its own rate limit.
    """

    def __init__(self, refresh_before_expiry: int = TOKEN_TTL):
        self._refresh_before = refresh_before_expiry
        self._lock = threading.RLock()
        self._store: dict[str, tuple[float, str]] = {}  # key → (expires_at, token)

    def _key(self, tenant_id: str, client_id: str) -> str:
        return f"{tenant_id}:{client_id}"

    def get(self, tenant_id: str, client_id: str) -> str | None:
        key = self._key(tenant_id, client_id)
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            exp, token = entry
            if time.monotonic() >= exp:
                del self._store[key]
                logger.debug("[TokenCache] expired key=%r", key)
                return None
            return token

    def set(self, tenant_id: str, client_id: str, token: str) -> None:
        key = self._key(tenant_id, client_id)
        with self._lock:
            self._store[key] = (time.monotonic() + self._refresh_before, token)
            logger.debug("[TokenCache] cached token for key=%r (TTL=%ds)", key, self._refresh_before)


token_cache = _TokenCache()
