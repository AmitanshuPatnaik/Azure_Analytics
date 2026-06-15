import requests

from services.Azure.azure_auth import get_azure_token
from core.config import azure_management_base_url


def _fetch_subscriptions_live(project_name: str = None):
    if not azure_management_base_url:
        raise ValueError("Azure Management Base URL is not configured")
    token = get_azure_token(project_name)

    headers = {
        "Authorization": f"Bearer {token}"
    }

    url = f"{azure_management_base_url}?api-version=2020-01-01"

    response = requests.get(url, headers=headers, timeout=10)
    response.raise_for_status()

    data = response.json()
    # Azure returns {"value": [...]} — normalize to {"subscriptions": [...]}
    raw_subs = data.get("value", [])
    subscriptions = []
    for sub in raw_subs:
        if not isinstance(sub, dict):
            continue
        subscriptions.append({
            "subscriptionId": sub.get("subscriptionId"),
            "displayName": sub.get("displayName"),
            "state": sub.get("state")
        })
    return {
        "success": True,
        "subscriptions": subscriptions
    }


def fetch_subscriptions(project_name: str = None):
    """
    Fetch subscriptions with multi-tiered persistent cache (TTL = 2 hours).
    """
    from core.azure_cache import get_cached_azure_data, get_cache_key
    key = get_cache_key("subscriptions", project_name or "default")
    try:
        return get_cached_azure_data(
            key=key,
            fetch_fn=lambda: _fetch_subscriptions_live(project_name),
            ttl=7200
        )
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "subscriptions": []
        }