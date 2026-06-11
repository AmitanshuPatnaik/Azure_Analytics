"""
repositories_routes.py
──────────────────────
Critical cached endpoint:
  GET /api/repos  — reads from local cache (no live call)

All parameterised per-project / per-repo endpoints below still make live
calls because they are scoped to specific parameters supplied at runtime
and cannot practically be pre-cached en masse.
"""

from fastapi import APIRouter

<<<<<<< HEAD
from app.core.data_cache import cache
from app.services.Azure_Devops.repositories_service import (
=======
from core.data_cache import cache
from services.Azure_Devops.repositories_service import (
>>>>>>> 81abce3 (Modified Backend imports)
    fetch_branches,
    fetch_commits,
    fetch_files,
    fetch_pull_requests,
    fetch_pushes,
    fetch_repositories,
    fetch_tags,
)

router = APIRouter(tags=["Repositories"])

# ── Cold-cache fallback ──────────────────────────────────────────────────── #
_COLD_CACHE_RESPONSE = {
    "success": False,
    "count": 0,
    "repositories": [],
    "message": "Data is warming up. The background sync is in progress — please retry in a few seconds.",
}


# ── CACHED endpoint ──────────────────────────────────────────────────────── #

@router.get("/repos")
async def get_all_repositories():
    """
    Return all repositories (across all projects) from the local cache.
    Response time: sub-10 ms (in-memory read, no I/O).
    """
    return cache.get("repos", _COLD_CACHE_RESPONSE)


# ── Live endpoints (parameterised, not pre-cacheable) ───────────────────── #

@router.get("/projects/{project_name}/repos")
async def get_repositories(project_name: str):
    return fetch_repositories(project_name)


@router.get("/projects/{project_name}/repos/{repo_name}/files")
async def get_files(project_name: str, repo_name: str):
    return fetch_files(project_name, repo_name)


@router.get("/projects/{project_name}/repos/{repo_name}/commits")
async def get_commits(project_name: str, repo_name: str):
    return fetch_commits(project_name, repo_name)


@router.get("/projects/{project_name}/repos/{repo_name}/pushes")
async def get_pushes(project_name: str, repo_name: str):
    return fetch_pushes(project_name, repo_name)


@router.get("/projects/{project_name}/repos/{repo_name}/branches")
async def get_branches(project_name: str, repo_name: str):
    return fetch_branches(project_name, repo_name)


@router.get("/projects/{project_name}/repos/{repo_name}/tags")
async def get_tags(project_name: str, repo_name: str):
    return fetch_tags(project_name, repo_name)


@router.get("/projects/{project_name}/repos/{repo_name}/pullrequests")
async def get_pull_requests(project_name: str, repo_name: str):
    return fetch_pull_requests(project_name, repo_name)