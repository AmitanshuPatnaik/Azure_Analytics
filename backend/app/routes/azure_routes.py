from fastapi import APIRouter
from app.core.data_cache import cache
from app.services.Azure.subscriptions import fetch_subscriptions
from app.services.Azure.costs import (
    fetch_total_cost,
    fetch_daily_costs,
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
async def get_cost_trend():
    cached = cache.get("costs:trend")
    if cached is not None:
        return cached
        
    # Active Fallback if cache is cold on load
    live_fallback = fetch_aggregated_monthly_costs()
    if live_fallback and live_fallback.get("success"):
        cache.set("costs:trend", live_fallback)
        return live_fallback
    return _COLD_TREND_FALLBACK


@router.get("/subscriptions")
async def get_subscriptions():
    return fetch_subscriptions()


# ── Cached Subscription Wildcard Endpoints ──────────────────────────────── #

@router.get("/costs/{subscription_id}")
async def get_costs(subscription_id: str):
    cached = cache.get(f"costs:{subscription_id}")
    if cached is not None:
        return cached
        
    live_fallback = fetch_total_cost(subscription_id)
    if live_fallback and live_fallback.get("success"):
        cache.set(f"costs:{subscription_id}", live_fallback)
        return live_fallback
    return _COLD_COST_RESPONSE


@router.get("/costs/{subscription_id}/total")
async def get_total_cost(subscription_id: str):
    cached = cache.get(f"total:{subscription_id}")
    if cached is not None:
        return cached
        
    live_fallback = fetch_total_cost(subscription_id)
    if live_fallback and live_fallback.get("success"):
        cache.set(f"total:{subscription_id}", live_fallback)
        return live_fallback
    return _COLD_COST_RESPONSE


@router.get("/costs/{subscription_id}/resourcegroups")
async def get_resource_group_costs(subscription_id: str):
    return cache.get(f"resourcegroups:{subscription_id}", {"success": True, "resource_groups": [], "rows": []})


@router.get("/costs/{subscription_id}/services")
async def get_service_costs(subscription_id: str):
    return cache.get(f"services:{subscription_id}", {"success": True, "services": [], "rows": []})


@router.get("/costs/{subscription_id}/top-resources")
async def get_top_resources(subscription_id: str):
    """
    Top high-spending resources — corrected to use the authentic 'topresources' key
    with a live API fallback strategy if the cache is cold.
    """
    cached = cache.get(f"topresources:{subscription_id}")
    
    # If cache is populated and contains valid asset records, return it instantly
    if cached and isinstance(cached, dict) and cached.get("top_resources"):
        return cached
        
    # Live fallback gate if the background daemon thread has not populated this key yet
    live_fallback = fetch_top_resources(subscription_id)
    if live_fallback and live_fallback.get("success") and live_fallback.get("top_resources"):
        cache.set(f"topresources:{subscription_id}", live_fallback)
        return live_fallback
        
    return cached if cached else {"success": True, "top_resources": [], "rows": []}


@router.get("/costs/{subscription_id}/budgets")
async def get_budgets(subscription_id: str):
    return cache.get(f"budgets:{subscription_id}", {"success": True, "budgets": []})


@router.get("/costs/{subscription_id}/yearly")
async def get_yearly_costs(subscription_id: str):
    cached = cache.get(f"yearly:{subscription_id}")
    if cached and isinstance(cached, dict) and cached.get("success") and cached.get("yearly_cost", 0) > 0:
        return cached
        
    live_fallback = fetch_yearly_costs(subscription_id)
    if live_fallback and live_fallback.get("success"):
        cache.set(f"yearly:{subscription_id}", live_fallback)
        return live_fallback
    return cached if cached else {"success": True, "yearly_costs": [], "rows": [], "yearly_cost": 0.0}


# ── Analytical Live Operations ──────────────────────────────────────────── #

@router.get("/costs/{subscription_id}/daily")
async def get_daily_costs(subscription_id: str):
    return fetch_daily_costs(subscription_id)


@router.get("/costs/{subscription_id}/monthly")
async def get_monthly_costs(subscription_id: str):
    return fetch_monthly_costs(subscription_id)


@router.get("/costs/{subscription_id}/resources")
async def get_resource_costs(subscription_id: str):
    return fetch_resource_costs(subscription_id)