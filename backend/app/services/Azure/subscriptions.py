import requests

from app.services.Azure.azure_auth import get_azure_token
from app.core.config import azure_management_base_url


def fetch_subscriptions():
    token = get_azure_token()

    headers = {
        "Authorization": f"Bearer {token}"
    }

    url = f"{azure_management_base_url}?api-version=2020-01-01"

    response = requests.get(url, headers=headers)

    return response.json()