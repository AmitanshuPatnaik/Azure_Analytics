import requests

from app.services.Azure.azure_auth import get_azure_token
from app.core.config import azure_management_base_url


def fetch_subscriptions(project_name: str = None):
    if not azure_management_base_url:
        return {
            "success": False,
            "error": "Azure Management Base URL is not configured",
            "subscriptions": []
        }
    try:
        token = get_azure_token(project_name)

        headers = {
            "Authorization": f"Bearer {token}"
        }

        url = f"{azure_management_base_url}?api-version=2020-01-01"

        response = requests.get(url, headers=headers, timeout=10)

        if response.status_code != 200:
            return {
                "success": False,
                "error": "Failed to fetch subscriptions from Azure",
                "subscriptions": []
            }

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
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "subscriptions": []
        }