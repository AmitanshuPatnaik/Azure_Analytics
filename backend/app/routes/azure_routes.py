from fastapi import APIRouter

from app.services.Azure.subscriptions import fetch_subscriptions
from app.services.Azure.costs import fetch_costs

router = APIRouter(prefix="/azure", tags=["Azure"])


@router.get("/subscriptions")
async def get_subscriptions():
    return fetch_subscriptions()

@router.get("/costs/{subscription_id}")
async def get_costs(subscription_id: str):
    return fetch_costs(subscription_id)