import requests

from app.core.config import tenant_id, client_id, client_secret


def get_azure_token():
    url = f"https://login.microsoftonline.com/{tenant_id}/oauth2/v2.0/token"

    payload = {
        "client_id": client_id,
        "client_secret": client_secret,
        "scope": "https://management.azure.com/.default",
        "grant_type": "client_credentials"
    }

    response = requests.post(url, data=payload)

    response.raise_for_status()

    return response.json()["access_token"]