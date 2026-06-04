import requests

from app.services.Azure.azure_auth import get_azure_token


def fetch_subscriptions():
    token = get_azure_token()

    headers = {
        "Authorization": f"Bearer {token}"
    }

    url = "https://management.azure.com/subscriptions?api-version=2020-01-01"

    response = requests.get(url, headers=headers)

    return response.json()