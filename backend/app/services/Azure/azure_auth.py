import logging
import requests
from contextvars import ContextVar

logger = logging.getLogger(__name__)

azure_project_var = ContextVar("azure_project", default=None)


def get_azure_token(project_name: str = None):
    import json
    import os
    import re
    from core.azure_throttle import token_cache

    _config_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "config.json")
    try:
        with open(_config_path, "r") as f:
            config = json.load(f)
    except Exception:
        config = {}

    if not project_name:
        project_name = azure_project_var.get()

    t_id = None
    c_id = None
    c_secret = None

    if project_name:
        name_clean = str(project_name).strip().upper()
        snake = re.sub(r'(?<!^)(?=[A-Z])', '_', project_name).upper()
        possible_prefixes = [
            snake,
            name_clean,
            snake.replace("AI_", ""),
            snake.replace("_FLOW", ""),
        ]
        for prefix in possible_prefixes:
            t_key = f"{prefix}_TENANT_ID"
            c_key = f"{prefix}_CLIENT_ID"
            s_key = f"{prefix}_CLIENT_SECRET"
            if t_key in config and c_key in config and s_key in config:
                t_id = config[t_key]
                c_id = config[c_key]
                c_secret = config[s_key]
                break

    if not t_id or not c_id or not c_secret:
        prefixes = []
        for key in config.keys():
            if key.endswith("_TENANT_ID"):
                prefix = key[:-10]
                if f"{prefix}_CLIENT_ID" in config and f"{prefix}_CLIENT_SECRET" in config:
                    prefixes.append(prefix)
        if prefixes:
            fallback_prefix = prefixes[0]
            t_id = config.get(f"{fallback_prefix}_TENANT_ID")
            c_id = config.get(f"{fallback_prefix}_CLIENT_ID")
            c_secret = config.get(f"{fallback_prefix}_CLIENT_SECRET")

    if not t_id or not c_id or not c_secret:
        logger.error("[AzureAuth] Azure configuration is incomplete or missing in config.json for project '%s'", project_name)
        raise ValueError("Azure configuration is incomplete or missing in config.json")

    cached_token = token_cache.get(t_id, c_id)
    if cached_token:
        logger.debug("[AzureAuth] Token cache hit for project '%s' (tenant=%s)", project_name, t_id)
        return cached_token

    url = f"https://login.microsoftonline.com/{t_id}/oauth2/v2.0/token"

    payload = {
        "client_id": c_id,
        "client_secret": c_secret,
        "scope": "https://management.azure.com/.default",
        "grant_type": "client_credentials"
    }

    response = requests.post(url, data=payload, timeout=10)
    response.raise_for_status()

    token = response.json()["access_token"]
    token_cache.set(t_id, c_id, token)
    logger.info("[AzureAuth] Acquired and cached new Azure AD token for project '%s' (tenant=%s)", project_name, t_id)
    return token
