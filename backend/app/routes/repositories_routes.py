from fastapi import APIRouter

from core.data_cache import cache
from core.azure_throttle import _TtlCache
from services.Azure_Devops.repositories_service import (
    fetch_branches,
    fetch_commits,
    fetch_files,
    fetch_pull_requests,
    fetch_pushes,
    fetch_repositories,
    fetch_tags,
)

router = APIRouter(tags=["Repositories"])

_COLD_CACHE_RESPONSE = {
    "success": False,
    "count": 0,
    "repositories": [],
    "message": "Data is warming up. The background sync is in progress — please retry in a few seconds.",
}

# 5-minute cache for DevOps metrics
devops_cache = _TtlCache(ttl=300)


@router.get("/repos")
async def get_all_repositories():
    return cache.get("repos", _COLD_CACHE_RESPONSE)


@router.get("/projects/{project_name}/repos")
async def get_repositories(project_name: str):
    cached_repos = cache.get("repos")
    if isinstance(cached_repos, dict) and cached_repos.get("success"):
        proj_repos = [
            repo for repo in cached_repos.get("repositories", [])
            if isinstance(repo, dict) and repo.get("project", "").lower() == project_name.lower()
        ]
        return {
            "success": True,
            "count": len(proj_repos),
            "repositories": proj_repos
        }
    return fetch_repositories(project_name)


@router.get("/projects/{project_name}/repos/{repo_name}/files")
async def get_files(project_name: str, repo_name: str):
    return fetch_files(project_name, repo_name)


@router.get("/projects/{project_name}/repos/{repo_name}/commits")
async def get_commits(project_name: str, repo_name: str):
    cache_key = f"commits:{project_name}:{repo_name}"
    cached = devops_cache.get(cache_key)
    if cached is not None:
        return cached
    result = fetch_commits(project_name, repo_name)
    if isinstance(result, dict) and result.get("success"):
        devops_cache.set(cache_key, result)
    return result


@router.get("/projects/{project_name}/repos/{repo_name}/pushes")
async def get_pushes(project_name: str, repo_name: str):
    cache_key = f"pushes:{project_name}:{repo_name}"
    cached = devops_cache.get(cache_key)
    if cached is not None:
        return cached
    result = fetch_pushes(project_name, repo_name)
    if isinstance(result, dict) and result.get("success"):
        devops_cache.set(cache_key, result)
    return result


@router.get("/projects/{project_name}/repos/{repo_name}/branches")
async def get_branches(project_name: str, repo_name: str):
    cache_key = f"branches:{project_name}:{repo_name}"
    cached = devops_cache.get(cache_key)
    if cached is not None:
        return cached
    result = fetch_branches(project_name, repo_name)
    if isinstance(result, dict) and result.get("success"):
        devops_cache.set(cache_key, result)
    return result


@router.get("/projects/{project_name}/repos/{repo_name}/tags")
async def get_tags(project_name: str, repo_name: str):
    return fetch_tags(project_name, repo_name)


@router.get("/projects/{project_name}/repos/{repo_name}/pullrequests")
async def get_pull_requests(project_name: str, repo_name: str):
    cache_key = f"pullrequests:{project_name}:{repo_name}"
    cached = devops_cache.get(cache_key)
    if cached is not None:
        return cached
    result = fetch_pull_requests(project_name, repo_name)
    if isinstance(result, dict) and result.get("success"):
        devops_cache.set(cache_key, result)
    return result