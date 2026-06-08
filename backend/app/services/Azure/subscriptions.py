import requests

from app.services.Azure.azure_auth import get_azure_token
from app.core.config import azure_management_base_url


def fetch_subscriptions():
    if not azure_management_base_url:
        return {
            "success": False,
            "error": "Azure Management Base URL is not configured",
            "subscriptions": []
        }
    try:
        token = get_azure_token()

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

        return response.json()
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "subscriptions": []
        }