from fastapi import APIRouter

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
    fetch_budgets
)

router = APIRouter(prefix="/azure", tags=["Azure"])


@router.get("/subscriptions")
async def get_subscriptions():
    return fetch_subscriptions()

@router.get("/costs/{subscription_id}")
async def get_costs(subscription_id: str):
    return fetch_total_cost(subscription_id)

@router.get("/costs/{subscription_id}/total")
async def get_total_cost(subscription_id: str):
    return fetch_total_cost(subscription_id)

@router.get("/costs/{subscription_id}/daily")
async def get_daily_costs(subscription_id: str):
    return fetch_daily_costs(subscription_id)

@router.get("/costs/{subscription_id}/monthly")
async def get_monthly_costs(subscription_id: str):
    return fetch_monthly_costs(subscription_id)

@router.get("/costs/{subscription_id}/yearly")
async def get_yearly_costs(subscription_id: str):
    return fetch_yearly_costs(subscription_id)

@router.get("/costs/{subscription_id}/resourcegroups")
async def get_resource_group_costs(subscription_id: str):
    return fetch_resource_group_costs(subscription_id)

@router.get("/costs/{subscription_id}/services")
async def get_service_costs(subscription_id: str):
    return fetch_service_costs(subscription_id)

@router.get("/costs/{subscription_id}/resources")
async def get_resource_costs(subscription_id: str):
    return fetch_resource_costs(subscription_id)

@router.get("/costs/{subscription_id}/top-resources")
async def get_top_resources(subscription_id: str):
    return fetch_top_resources(subscription_id)

@router.get("/costs/{subscription_id}/budgets")
async def get_budgets(subscription_id: str):
    return fetch_budgets(subscription_id)