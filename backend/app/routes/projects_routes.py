"""
projects_routes.py
──────────────────
GET /api/projects

Reads directly from the local in-memory data cache populated by the
background SyncWorker.  No live network call is made on this path.

Cold-cache behaviour (first few seconds after server start, before the
initial sync sweep completes): returns a safe "warming up" placeholder so
the frontend never receives a 500 error or an empty null payload.
"""

from fastapi import APIRouter

from core.data_cache import cache


router = APIRouter(prefix="/projects", tags=["Projects"])

# ── Cold-cache fallback ──────────────────────────────────────────────────── #
_COLD_CACHE_RESPONSE = {
    "success": False,
    "count": 0,
    "projects": [],
    "message": "Data is warming up. The background sync is in progress — please retry in a few seconds.",
}


@router.get("")
async def get_projects():
    """
    Return the projects list from the local cache.
    Response time: sub-10 ms (in-memory read, no I/O).
    """
    return cache.get("projects", _COLD_CACHE_RESPONSE)