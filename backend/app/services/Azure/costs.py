from datetime import datetime
import requests
import time
from fastapi.responses import JSONResponse

from app.services.Azure.azure_auth import get_azure_token
from app.core.config import azure_cost_base_url

def execute_cost_query(subscription_id, payload):

    token = get_azure_token()

    url = (
        f"https://management.azure.com/"
        f"subscriptions/{subscription_id}"
        f"/providers/Microsoft.CostManagement/query"
        f"?api-version=2023-03-01"
    )

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    for attempt in range(3):

        response = requests.post(
            url=url,
            headers=headers,
            json=payload
        )

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


def fetch_total_cost(subscription_id):

    payload = {
        "type": "ActualCost",
        "timeframe": "MonthToDate",
        "dataset": {
            "granularity": "None",
            "aggregation": {
                "totalCost": {
                    "name": "Cost",
                    "function": "Sum"
                }
            }
        }
    }

    return execute_cost_query(
        subscription_id,
        payload
    )


def fetch_daily_costs(subscription_id):

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

    return execute_cost_query(
        subscription_id,
        payload
    )


def fetch_monthly_costs(subscription_id):

    payload = {
        "type": "ActualCost",
        "timeframe": "TheLast6Months",
        "dataset": {
            "granularity": "Monthly",
            "aggregation": {
                "totalCost": {
                    "name": "Cost",
                    "function": "Sum"
                }
            }
        }
    }

    return execute_cost_query(
        subscription_id,
        payload
    )


def fetch_yearly_costs(subscription_id):

    current_year = datetime.now().year

    payload = {
        "type": "ActualCost",
        "timeframe": "Custom",
        "timePeriod": {
            "from": f"{current_year}-01-01T00:00:00Z",
            "to": datetime.utcnow().strftime(
                "%Y-%m-%dT23:59:59Z"
            )
        },
        "dataset": {
            "granularity": "Monthly",
            "aggregation": {
                "totalCost": {
                    "name": "Cost",
                    "function": "Sum"
                }
            }
        }
    }

    return execute_cost_query(
        subscription_id,
        payload
    )


def fetch_resource_group_costs(subscription_id):

    payload = {
        "type": "ActualCost",
        "timeframe": "MonthToDate",
        "dataset": {
            "granularity": "None",
            "aggregation": {
                "totalCost": {
                    "name": "Cost",
                    "function": "Sum"
                }
            },
            "grouping": [
                {
                    "type": "Dimension",
                    "name": "ResourceGroup"
                }
            ]
        }
    }

    return execute_cost_query(
        subscription_id,
        payload
    )


def fetch_service_costs(subscription_id):

    payload = {
        "type": "ActualCost",
        "timeframe": "MonthToDate",
        "dataset": {
            "granularity": "None",
            "aggregation": {
                "totalCost": {
                    "name": "Cost",
                    "function": "Sum"
                }
            },
            "grouping": [
                {
                    "type": "Dimension",
                    "name": "ServiceName"
                }
            ]
        }
    }

    return execute_cost_query(
        subscription_id,
        payload
    )


def fetch_resource_costs(subscription_id):

    payload = {
        "type": "ActualCost",
        "timeframe": "MonthToDate",
        "dataset": {
            "granularity": "None",
            "aggregation": {
                "totalCost": {
                    "name": "Cost",
                    "function": "Sum"
                }
            },
            "grouping": [
                {
                    "type": "Dimension",
                    "name": "ResourceId"
                }
            ]
        }
    }

    return execute_cost_query(
        subscription_id,
        payload
    )


def fetch_top_resources(subscription_id):

    payload = {
        "type": "ActualCost",
        "timeframe": "MonthToDate",
        "dataset": {
            "granularity": "None",
            "aggregation": {
                "totalCost": {
                    "name": "Cost",
                    "function": "Sum"
                }
            },
            "grouping": [
                {
                    "type": "Dimension",
                    "name": "ResourceId"
                }
            ],
            "sorting": [
                {
                    "direction": "descending",
                    "name": "Cost"
                }
            ]
        }
    }

    return execute_cost_query(
        subscription_id,
        payload
    )

def fetch_budgets(subscription_id):
    token = get_azure_token()

    url = f"{azure_cost_base_url}/{subscription_id}/providers/Microsoft.Consumption/budgets?api-version=2024-08-01"

    headers = {
        "Authorization": f"Bearer {token}"
    }

    response = requests.get(url,headers=headers)

    if response.status_code != 200:
        return JSONResponse(
            status_code=response.status_code,
            content=response.json()
        )

    return response.json()