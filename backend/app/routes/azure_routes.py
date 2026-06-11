from fastapi import APIRouter, Query
from app.core.data_cache import cache
from app.services.Azure.azure_auth import azure_project_var
from app.services.Azure.subscriptions import fetch_subscriptions
from app.services.Azure.costs import (
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

@router.get("/projects")
async def get_azure_projects():
    import json
    try:
        with open("config.json", "r") as f:
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
async def get_cost_trend(project: str = Query(None)):
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
async def get_subscriptions(project: str = Query(None)):
    azure_project_var.set(project)
    return fetch_subscriptions(project)


# ── Cached Subscription Wildcard Endpoints ──────────────────────────────── #

@router.get("/costs/{subscription_id}")
async def get_costs(subscription_id: str, project: str = Query(None)):
    azure_project_var.set(project)
    cache_key = f"costs:{subscription_id}:{project}" if project else f"costs:{subscription_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
        
    live_fallback = fetch_total_cost(subscription_id)
    if live_fallback and live_fallback.get("success"):
        cache.set(cache_key, live_fallback)
        return live_fallback
    return _COLD_COST_RESPONSE


@router.get("/costs/{subscription_id}/total")
async def get_total_cost(subscription_id: str, project: str = Query(None)):
    azure_project_var.set(project)
    cache_key = f"total:{subscription_id}:{project}" if project else f"total:{subscription_id}"
    cached = cache.get(cache_key)
    if cached is not None:
        return cached
        
    live_fallback = fetch_total_cost(subscription_id)
    if live_fallback and live_fallback.get("success"):
        cache.set(cache_key, live_fallback)
        return live_fallback
    return _COLD_COST_RESPONSE


@router.get("/costs/{subscription_id}/resourcegroups")
async def get_resource_group_costs(subscription_id: str, project: str = Query(None)):
    azure_project_var.set(project)
    cache_key = f"resourcegroups:{subscription_id}:{project}" if project else f"resourcegroups:{subscription_id}"
    return cache.get(cache_key, {"success": True, "resource_groups": [], "rows": []})


@router.get("/costs/{subscription_id}/services")
async def get_service_costs(subscription_id: str, project: str = Query(None)):
    """
    Costs grouped by service name — reads from cache first, falls back to live API.
    """
    azure_project_var.set(project)
    cache_key = f"services:{subscription_id}:{project}" if project else f"services:{subscription_id}"
    cached = cache.get(cache_key)

    if cached and isinstance(cached, dict) and cached.get("rows"):
        return cached

    # Live fallback if the cache worker hasn't populated this key yet
    live_fallback = fetch_service_costs(subscription_id)
    if live_fallback and live_fallback.get("success") and live_fallback.get("rows"):
        cache.set(cache_key, live_fallback)
        return live_fallback

    return cached if cached else {"success": True, "services": [], "rows": []}


@router.get("/costs/{subscription_id}/top-resources")
async def get_top_resources(subscription_id: str, project: str = Query(None)):
    """
    Top high-spending resources — corrected to use the authentic 'topresources' key
    with a live API fallback strategy if the cache is cold.
    """
    azure_project_var.set(project)
    cache_key = f"topresources:{subscription_id}:{project}" if project else f"topresources:{subscription_id}"
    cached = cache.get(cache_key)
    
    # If cache is populated and contains valid asset records, return it instantly
    if cached and isinstance(cached, dict) and cached.get("top_resources"):
        return cached
        
    # Live fallback gate if the background daemon thread has not populated this key yet
    live_fallback = fetch_top_resources(subscription_id)
    if live_fallback and live_fallback.get("success") and live_fallback.get("top_resources"):
        cache.set(cache_key, live_fallback)
        return live_fallback
        
    return cached if cached else {"success": True, "top_resources": [], "rows": []}


@router.get("/costs/{subscription_id}/budgets")
async def get_budgets(subscription_id: str, project: str = Query(None)):
    """
    Active budget thresholds — reads from cache first, falls back to live API.
    """
    azure_project_var.set(project)
    cache_key = f"budgets:{subscription_id}:{project}" if project else f"budgets:{subscription_id}"
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
async def get_yearly_costs(subscription_id: str, project: str = Query(None)):
    azure_project_var.set(project)
    cache_key = f"yearly:{subscription_id}:{project}" if project else f"yearly:{subscription_id}"
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
async def get_daily_costs(subscription_id: str, project: str = Query(None)):
    azure_project_var.set(project)
    return fetch_daily_costs(subscription_id)


@router.get("/costs/{subscription_id}/daily-range")
async def get_daily_costs_by_range(
    subscription_id: str,
    from_date: str = Query(..., description="Start date in YYYY-MM-DD format"),
    to_date:   str = Query(..., description="End date in YYYY-MM-DD format"),
    project:   str = Query(None),
):
    azure_project_var.set(project)
    return fetch_daily_costs_by_range(subscription_id, from_date, to_date)


@router.get("/costs/{subscription_id}/monthly")
async def get_monthly_costs(subscription_id: str, project: str = Query(None)):
    azure_project_var.set(project)
    return fetch_monthly_costs(subscription_id)


@router.get("/costs/{subscription_id}/resources")
async def get_resource_costs(subscription_id: str, project: str = Query(None)):
    azure_project_var.set(project)
    return fetch_resource_costs(subscription_id)