import requests
import time
from fastapi.responses import JSONResponse

from app.services.Azure.azure_auth import get_azure_token
from app.core.config import azure_cost_base_url


def fetch_costs(subscription_id):
    token = get_azure_token()

    url = f"{azure_cost_base_url}/{subscription_id}/providers/Microsoft.CostManagement/query?api-version=2023-03-01"

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    payload = {
        "type": "ActualCost",
        "timeframe": "MonthToDate",
        "dataset": {
            "granularity": "Daily",
            "aggregation": {
                "totalCost": {
                    "name": "Cost",
                    "function": "Sum"
                }
            }
        }
    }

    for attempt in range(3):
        response = requests.post(url, headers=headers,json=payload)

        """
        print("\nCOST API")
        print("Status Code:", response.status_code)

        print("\nHeaders:")
        for key, value in response.headers.items():
            print(f"{key}: {value}")

        print("\nBody:")
        print(response.text)
        """
        
        if response.status_code == 200:
            return response.json()

        if response.status_code == 429:
            time.sleep(5)
            continue

        return JSONResponse(
            status_code=response.status_code,
            content=response.json()
        )

    return JSONResponse(
        status_code=429,
        content={
            "error": "Azure Cost Management rate limit exceeded"
        }
    )