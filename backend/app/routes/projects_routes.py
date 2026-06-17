from fastapi import APIRouter

from core.data_cache import cache

router = APIRouter(prefix="/projects", tags=["Projects"])

_COLD_CACHE_RESPONSE = {
    "success": False,
    "count": 0,
    "projects": [],
    "message": "Data is warming up. The background sync is in progress — please retry in a few seconds.",
}


@router.get("")
async def get_projects():
    return cache.get("projects", _COLD_CACHE_RESPONSE)