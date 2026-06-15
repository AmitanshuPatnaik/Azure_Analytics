from fastapi import APIRouter, Query
from core.data_cache import cache
from services.Azure.azure_auth import azure_project_var
from services.Azure.subscriptions import fetch_subscriptions
from services.Azure.costs import (
    fetch_total_cost,
    fetch_daily_costs,
    fetch_daily_costs_by_range,
    fetch_monthly_costs,
    fetch_yearly_costs,
    fetch_resource_group_costs,
    fetch_service_costs,
    fetch_resource_costs,
    fetch_top_resources,
    fetch_budgets,
    fetch_aggregated_monthly_costs,
)

router = APIRouter(prefix="/azure", tags=["Azure"])

_sub_project_map = {}

def resolve_project_for_subscription(subscription_id: str) -> str | None:
    if not subscription_id:
        return None
    if subscription_id in _sub_project_map:
        return _sub_project_map[subscription_id]
        
    from services.Azure.subscriptions import fetch_subscriptions
    projects = ["DocFlow", "TimeFlow", "Integrelity"]
    for proj in projects:
        try:
            res = fetch_subscriptions(proj)
            if res.get("success"):
                for sub in res.get("subscriptions", []):
                    sub_val = sub.get("subscriptionId")
                    if sub_val:
                        _sub_project_map[sub_val] = proj
                        if sub_val.lower() == subscription_id.lower():
                            return proj
        except Exception:
            pass
    return None

@router.get("/projects")
def get_azure_projects():
    import json
    import os
    _config_path = os.path.join(os.path.dirname(__file__), "..", "..", "config.json")
    try:
        with open(_config_path, "r") as f:
            config = json.load(f)
    except Exception:
        config = {}
    
    projects = []
    for key in config.keys():
        if key.endswith("_TENANT_ID"):
            prefix = key[:-10]
            if f"{prefix}_CLIENT_ID" in config and f"{prefix}_CLIENT_SECRET" in config:
                if prefix == "DOC_FLOW":
                    name = "AiDocFlo"
                else:
                    words = prefix.lower().split("_")
                    name = "".join(word.capitalize() for word in words)
                projects.append(name)
    return {"success": True, "projects": projects}

# ── Backup Baselines (Used only if both Cache AND Live Azure APIs crash) ─── #
_COLD_TREND_FALLBACK = {
    "success": True,
    "trend": [
        {"month": "January", "cost": 0}, {"month": "February", "cost": 0},
        {"month": "March", "cost": 0}, {"month": "April", "cost": 0},
        {"month": "May", "cost": 0}, {"month": "June", "cost": 0}
    ]
}
_COLD_COST_RESPONSE = {"success": True, "total_cost": 0.0, "amount": 0.0}

@router.get("/costs/trend")
def get_cost_trend(project: str = Query(None)):
    azure_project_var.set(project)
    cache_key = f"costs:trend:{project}" if project else "costs:trend"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
        
    # Active Fallback if cache is cold on load
    live_fallback = fetch_aggregated_monthly_costs()
    if live_fallback and live_fallback.get("success"):
        cache.set(cache_key, live_fallback)
        return live_fallback
    return _COLD_TREND_FALLBACK


@router.get("/subscriptions")
def get_subscriptions(project: str = Query(None)):
    azure_project_var.set(project)
    return fetch_subscriptions(project)


# ── Cached Subscription Wildcard Endpoints ──────────────────────────────── #

@router.get("/costs/{subscription_id}")
def get_costs(subscription_id: str, project: str = Query(None)):
    if not project:
        project = resolve_project_for_subscription(subscription_id)
    azure_project_var.set(project)
    cache_key = f"costs:{subscription_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
        
    live_fallback = fetch_total_cost(subscription_id)
    if live_fallback and live_fallback.get("success"):
        cache.set(cache_key, live_fallback)
        return live_fallback
    return _COLD_COST_RESPONSE


@router.get("/costs/{subscription_id}/total")
def get_total_cost(subscription_id: str, project: str = Query(None)):
    if not project:
        project = resolve_project_for_subscription(subscription_id)
    azure_project_var.set(project)
    cache_key = f"total:{subscription_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
        
    live_fallback = fetch_total_cost(subscription_id)
    if live_fallback and live_fallback.get("success"):
        cache.set(cache_key, live_fallback)
        return live_fallback
    return _COLD_COST_RESPONSE


@router.get("/costs/{subscription_id}/resourcegroups")
def get_resource_group_costs(subscription_id: str, project: str = Query(None)):
    if not project:
        project = resolve_project_for_subscription(subscription_id)
    azure_project_var.set(project)
    cache_key = f"resourcegroups:{subscription_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
    
    live_fallback = fetch_resource_group_costs(subscription_id)
    if live_fallback and live_fallback.get("success"):
        cache.set(cache_key, live_fallback)
        return live_fallback
    return {"success": True, "resource_groups": [], "rows": []}


@router.get("/costs/{subscription_id}/services")
def get_service_costs(subscription_id: str, from_date: str = Query(None), to_date: str = Query(None), project: str = Query(None)):
    if not project:
        project = resolve_project_for_subscription(subscription_id)
    azure_project_var.set(project)
    
    if from_date or to_date:
        cache_key = f"services:{subscription_id}:{from_date}:{to_date}"
    else:
        cache_key = f"services:{subscription_id}"
        
    cached = cache.get(cache_key)

    if cached and isinstance(cached, dict) and cached.get("success") and cached.get("rows"):
        return cached

    # Live fallback if the cache worker hasn't populated this key yet
    live_fallback = fetch_service_costs(subscription_id, from_date, to_date)
    if live_fallback and live_fallback.get("success") and live_fallback.get("rows"):
        cache.set(cache_key, live_fallback)
        return live_fallback

    return cached if cached else live_fallback


@router.get("/costs/{subscription_id}/top-resources")
def get_top_resources(subscription_id: str, from_date: str = Query(None), to_date: str = Query(None), project: str = Query(None)):
    if not project:
        project = resolve_project_for_subscription(subscription_id)
    azure_project_var.set(project)
    
    if from_date or to_date:
        cache_key = f"topresources:{subscription_id}:{from_date}:{to_date}"
    else:
        cache_key = f"topresources:{subscription_id}"
        
    cached = cache.get(cache_key)
    
    # If cache is populated and contains valid asset records, return it instantly
    if cached and isinstance(cached, dict) and cached.get("success") and cached.get("top_resources"):
        return cached
        
    # Live fallback gate if the background daemon thread has not populated this key yet
    live_fallback = fetch_top_resources(subscription_id, from_date, to_date)
    if live_fallback and live_fallback.get("success") and live_fallback.get("top_resources"):
        cache.set(cache_key, live_fallback)
        return live_fallback
        
    return cached if cached else live_fallback

@router.get("/costs/{subscription_id}/budgets")
def get_budgets(subscription_id: str, project: str = Query(None)):
    """
    Active budget thresholds — reads from cache first, falls back to live API.
    """
    if not project:
        project = resolve_project_for_subscription(subscription_id)
    azure_project_var.set(project)
    cache_key = f"budgets:{subscription_id}"
    cached = cache.get(cache_key)

    if cached and isinstance(cached, dict) and cached.get("budgets") is not None:
        return cached

    # Live fallback if the cache worker hasn't populated this key yet
    live_fallback = fetch_budgets(subscription_id)
    if live_fallback and live_fallback.get("success"):
        cache.set(cache_key, live_fallback)
        return live_fallback

    return cached if cached else {"success": True, "budgets": []}


@router.get("/costs/{subscription_id}/yearly")
def get_yearly_costs(subscription_id: str, project: str = Query(None)):
    if not project:
        project = resolve_project_for_subscription(subscription_id)
    azure_project_var.set(project)
    cache_key = f"yearly:{subscription_id}"
    cached = cache.get(cache_key)
    if cached and isinstance(cached, dict) and cached.get("success") and cached.get("yearly_cost", 0) > 0:
        return cached
        
    live_fallback = fetch_yearly_costs(subscription_id)
    if live_fallback and live_fallback.get("success"):
        cache.set(cache_key, live_fallback)
        return live_fallback
    return cached if cached else {"success": True, "yearly_costs": [], "rows": [], "yearly_cost": 0.0}


# ── Analytical Live Operations ──────────────────────────────────────────── #

@router.get("/costs/{subscription_id}/daily")
def get_daily_costs(subscription_id: str, project: str = Query(None)):
    if not project:
        project = resolve_project_for_subscription(subscription_id)
    azure_project_var.set(project)
    return fetch_daily_costs(subscription_id)


@router.get("/costs/{subscription_id}/daily-range")
def get_daily_costs_by_range(
    subscription_id: str,
    from_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    to_date:   str = Query(..., description="End date in YYYY-MM-DD format"),
    project:   str = Query(None),
):
    if not project:
        project = resolve_project_for_subscription(subscription_id)
    azure_project_var.set(project)
    return fetch_daily_costs_by_range(subscription_id, from_date, to_date)


@router.get("/costs/{subscription_id}/monthly")
def get_monthly_costs(subscription_id: str, project: str = Query(None)):
    if not project:
        project = resolve_project_for_subscription(subscription_id)
    azure_project_var.set(project)
    return fetch_monthly_costs(subscription_id)


@router.get("/costs/{subscription_id}/resources")
def get_resource_costs(subscription_id: str, project: str = Query(None)):
    if not project:
        project = resolve_project_for_subscription(subscription_id)
    azure_project_var.set(project)
    return fetch_resource_costs(subscription_id)