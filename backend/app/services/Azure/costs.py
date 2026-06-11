import requests
import time

from services.Azure.azure_auth import get_azure_token
from core.config import azure_cost_base_url

def _execute_azure_query(subscription_id: str, payload: dict):
    """
    Internal core handler that executes the POST request to Azure Cost Management API
    with built-in exponential backoff retries for 429 rate limits.
    """
    try:
        token = get_azure_token()
        url = f"{azure_cost_base_url}/{subscription_id}/providers/Microsoft.CostManagement/query?api-version=2023-03-01"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        for attempt in range(3):
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            
            if response.status_code == 200:
                return response.json()
                
            if response.status_code == 429:
                time.sleep(5)
                continue
                
            return {
                "success": False,
                "status_code": response.status_code,
                "rows": [],
                "detail": "Azure Cost query returned an unhandled status down-stream."
            }

        return {
            "success": False,
            "status_code": 429,
            "error": "Azure Cost Management rate limit exceeded"
        }
    except Exception as e:
        # Return fallback structures for empty/missing Azure configurations
        return {
            "success": False,
            "error": "Azure Integration is not configured or offline",
            "message": str(e),
            "properties": {
                "rows": []
            }
        }


# 1. Fetch Month-To-Date overall billing total balance
def fetch_total_cost(subscription_id: str):
    payload = {
        "type": "ActualCost",
        "timeframe": "MonthToDate",
        "dataset": {
            "granularity": "None",
            "aggregation": {
                "totalCost": {"name": "Cost", "function": "Sum"}
            }
        }
    }
    result = _execute_azure_query(subscription_id, payload)

    # Safely extract the raw cost number out of Azure's return matrix
    total_amount = 0
    if "properties" in result and "rows" in result["properties"]:
        rows = result["properties"]["rows"]
        if rows and len(rows) > 0 and len(rows[0]) > 0:
            total_amount = rows[0][0]

    return {"success": True, "total_cost": total_amount, "amount": total_amount}

# 2. Fetch costs broken down by Service categories (e.g., Storage, Virtual Machines)
def fetch_service_costs(subscription_id: str):
    payload = {
        "type": "ActualCost",
        "timeframe": "MonthToDate",
        "dataset": {
            "granularity": "None",
            "aggregation": {
                "totalCost": {"name": "Cost", "function": "Sum"}
            },
            "grouping": [
                {"type": "Dimension", "name": "ServiceName"}
            ]
        }
    }
    result = _execute_azure_query(subscription_id, payload)
    rows = result.get("properties", {}).get("rows", [])
    return {"success": True, "services": rows, "rows": rows}

# 3. Fetch costs grouped by Resource Groups
def fetch_resource_group_costs(subscription_id: str):
    payload = {
        "type": "ActualCost",
        "timeframe": "MonthToDate",
        "dataset": {
            "granularity": "None",
            "aggregation": {
                "totalCost": {"name": "Cost", "function": "Sum"}
            },
            "grouping": [
                {"type": "Dimension", "name": "ResourceGroupName"}
            ]
        }
    }
    result = _execute_azure_query(subscription_id, payload)
    rows = result.get("properties", {}).get("rows", [])
    return {"success": True, "resource_groups": rows, "rows": rows}

# 4. Fetch daily cost tracking points
def fetch_daily_costs(subscription_id: str):
    payload = {
        "type": "ActualCost",
        "timeframe": "MonthToDate",
        "dataset": {
            "granularity": "Daily",
            "aggregation": {
                "totalCost": {"name": "Cost", "function": "Sum"}
            }
        }
    }
    result = _execute_azure_query(subscription_id, payload)
    rows = result.get("properties", {}).get("rows", [])
    return {"success": True, "daily_costs": rows, "rows": rows}


# 4b. Fetch day-wise costs for a custom date range
def fetch_daily_costs_by_range(subscription_id: str, from_date: str, to_date: str):
    """
    Fetch daily granularity costs between from_date and to_date (inclusive).
    Dates should be ISO format strings e.g. '2026-01-01'.
    Returns a list of { date: 'YYYY-MM-DD', cost: float } dicts sorted by date.
    """
    payload = {
        "type": "ActualCost",
        "timeframe": "Custom",
        "timePeriod": {
            "from": f"{from_date}T00:00:00+00:00",
            "to":   f"{to_date}T23:59:59+00:00"
        },
        "dataset": {
            "granularity": "Daily",
            "aggregation": {
                "totalCost": {"name": "Cost", "function": "Sum"}
            }
        }
    }
    result = _execute_azure_query(subscription_id, payload)
    raw_rows = result.get("properties", {}).get("rows", [])

    # Azure returns rows as [cost_float, date_int_YYYYMMDD, currency_str]
    points = []
    for row in raw_rows:
        if len(row) >= 2:
            cost = float(row[0])
            raw_date = str(row[1])          # e.g. "20260101"
            if len(raw_date) == 8 and raw_date.isdigit():
                label = f"{raw_date[:4]}-{raw_date[4:6]}-{raw_date[6:]}"
            else:
                label = raw_date
            points.append({"date": label, "cost": round(cost, 2)})

    points.sort(key=lambda p: p["date"])
    return {"success": True, "points": points, "count": len(points)}

# 5. Fetch monthly historical cost matrices
def fetch_monthly_costs(subscription_id: str):
    payload = {
        "type": "ActualCost",
        "timeframe": "YearToDate",
        "dataset": {
            "granularity": "Monthly",
            "aggregation": {
                "totalCost": {"name": "Cost", "function": "Sum"}
            }
        }
    }
    result = _execute_azure_query(subscription_id, payload)
    rows = result.get("properties", {}).get("rows", [])
    return {"success": True, "monthly_costs": rows, "rows": rows}

# 6. Fetch yearly summary projections
def fetch_yearly_costs(subscription_id: str):
    payload = {
        "type": "ActualCost",
        "timeframe": "YearToDate",
        "dataset": {
            "granularity": "None",
            "aggregation": {
                "totalCost": {"name": "Cost", "function": "Sum"}
            }
        }
    }
    result = _execute_azure_query(subscription_id, payload)
    
    # Safely isolate the nested rows from Azure's return structure
    rows = []
    if isinstance(result, dict) and "properties" in result:
        rows = result["properties"].get("rows", [])
    elif isinstance(result, dict):
        rows = result.get("rows", [])
        
    # 🎯 THE CRUCIAL FIX: Extract the single float value out of the array matrix
    yearly_amount = 0.0
    if rows and len(rows) > 0 and len(rows[0]) > 0:
        yearly_amount = rows[0][0]
        
    # Return an enriched payload contract that satisfies any frontend key variation
    return {
        "success": True, 
        "yearly_costs": rows, 
        "rows": rows,
        "yearly_cost": yearly_amount,
        "amount": yearly_amount,
        "total_cost": yearly_amount
    }

# 7. Fetch granular raw resource asset costs
def fetch_resource_costs(subscription_id: str):
    payload = {
        "type": "ActualCost",
        "timeframe": "MonthToDate",
        "dataset": {
            "granularity": "None",
            "aggregation": {
                "totalCost": {"name": "Cost", "function": "Sum"}
            },
            "grouping": [
                {"type": "Dimension", "name": "ResourceId"}
            ]
        }
    }
    result = _execute_azure_query(subscription_id, payload)
    rows = result.get("properties", {}).get("rows", [])
    return {"success": True, "resources": rows, "rows": rows}

# 8. Fetch the top high-spending resource instances
def _extract_resource_name(resource_id: str) -> str:
    """Extract the friendly resource name from a full Azure resource ID path.
    e.g. /subscriptions/.../providers/Microsoft.Storage/storageAccounts/myaccount → myaccount
    Falls back to the raw value if it cannot be parsed."""
    if not resource_id or not isinstance(resource_id, str):
        return resource_id or "Unknown"
    parts = [p for p in resource_id.strip("/").split("/") if p]
    return parts[-1] if parts else resource_id

def fetch_top_resources(subscription_id: str):
    payload = {
        "type": "ActualCost",
        "timeframe": "MonthToDate",
        "dataset": {
            "granularity": "None",
            "aggregation": {
                "totalCost": {"name": "Cost", "function": "Sum"}
            },
            "grouping": [
                {"type": "Dimension", "name": "ResourceId"}
            ]
        }
    }
    result = _execute_azure_query(subscription_id, payload)
    rows = result.get("properties", {}).get("rows", [])
    # Sort descending by the cost field (index 0 in Azure query array rows)
    sorted_rows = sorted(rows, key=lambda x: x[0], reverse=True) if rows else []

    # Replace the full ResourceId path with just the resource name in each row
    cleaned_rows = []
    for row in sorted_rows[:10]:
        if len(row) >= 2:
            cleaned = list(row)
            cleaned[1] = _extract_resource_name(str(row[1]))
            cleaned_rows.append(cleaned)
        else:
            cleaned_rows.append(row)

    return {"success": True, "top_resources": cleaned_rows, "rows": cleaned_rows}


# 9. Fetch active Cloud Spending budgets thresholds
def fetch_budgets(subscription_id: str):
    try:
        token = get_azure_token()
        url = f"https://management.azure.com/subscriptions/{subscription_id}/providers/Microsoft.Consumption/budgets?api-version=2023-05-01"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code == 200:
            data = response.json()
            budgets = []
            for b in data.get("value", []):
                if not isinstance(b, dict):
                    continue
                props = b.get("properties", {})
                budgets.append({
                    "name": b.get("name"),
                    "amount": props.get("amount"),
                    "timeGrain": props.get("timeGrain")
                })
            return {"success": True, "budgets": budgets}
        return {"success": True, "budgets": []}
    except Exception as e:
        return {"success": True, "budgets": [], "error": str(e)}


def fetch_aggregated_monthly_costs():
    from services.Azure.subscriptions import fetch_subscriptions
    from core.data_cache import cache # Safeguarded local lookup import
    
    try:
        subs_data = fetch_subscriptions()
    except Exception:
        subs_data = []

    subs = []
    if isinstance(subs_data, dict) and "subscriptions" in subs_data:
        subs = subs_data["subscriptions"]
    elif isinstance(subs_data, list):
        subs = subs_data

    # Emergency safety layer used ONLY if both the cache and Azure are completely offline
    fallback_data = [
        {"month": "January", "cost": 0}, {"month": "February", "cost": 0},
        {"month": "March", "cost": 0}, {"month": "April", "cost": 0},
        {"month": "May", "cost": 0}, {"month": "June", "cost": 0}
    ]

    if not subs:
        return {"success": False, "trend": fallback_data, "error": "No subscriptions found"}

    aggregated = {}
    has_real_data = False
    
    for sub in subs:
        sub_id = sub.get("subscriptionId")
        if not sub_id:
            continue
        try:
            # 🎯 READ FROM PRE-FETCHED WORKER MEMORY (Bypasses Azure 429 Throttling)
            res = cache.get(f"monthly:{sub_id}")
            
            # Defensive live fallback if the background cache worker hasn't processed this sub yet
            if not res or not isinstance(res, dict) or not res.get("rows"):
                res = fetch_monthly_costs(sub_id)
            
            if res and res.get("success") and res.get("rows"):
                has_real_data = True
                for row in res["rows"]:
                    if len(row) >= 2:
                        cost = float(row[0])
                        month_raw = str(row[1])
                        month_name = _parse_month_name(month_raw)
                        if month_name:
                            aggregated[month_name] = aggregated.get(month_name, 0.0) + cost
        except Exception:
            pass

    # 🎯 THE TRUTH RULE: Flag as False if live data fails so the router retries
    if not has_real_data:
        return {"success": False, "trend": fallback_data, "error": "API rate-limited or cache warming up"}

    month_order = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    trend = []
    for m in month_order:
        if m in aggregated:
            trend.append({"month": m, "cost": round(aggregated[m], 2)})

    if not trend:
        return {"success": False, "trend": fallback_data, "error": "Trend aggregation compiled empty"}

    return {"success": True, "trend": trend}


def _parse_month_name(month_str: str) -> str:
    cleaned = month_str.replace("-", "").replace("/", "").strip()
    month_num = None
    if len(cleaned) >= 6 and cleaned[:4].isdigit() and cleaned[4:6].isdigit():
        month_num = int(cleaned[4:6])
    elif len(cleaned) >= 2 and cleaned.isdigit():
        month_num = int(cleaned)

    month_names = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    if month_num and 1 <= month_num <= 12:
        return month_names[month_num - 1]

    for m in month_names:
        if m.lower() in month_str.lower():
            return m

    return ""