from fastapi import APIRouter

from core.data_cache import cache
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


@router.get("/repos")
async def get_all_repositories(page: int | None = None, page_size: int | None = None):
    res = cache.get("repos", _COLD_CACHE_RESPONSE)
    if not res.get("success"):
        return res
    repos = res.get("repositories", [])
    total_count = len(repos)
    if page is not None and page_size is not None:
        start = (page - 1) * page_size
        end = start + page_size
        sliced = repos[start:end]
    else:
        sliced = repos
    return {
        "success": True,
        "total_count": total_count,
        "count": len(sliced),
        "repositories": sliced
    }


@router.get("/projects/{project_name}/repos")
async def get_repositories(project_name: str, page: int = 1, page_size: int = 10, owner: str | None = None):
    result = fetch_repositories(project_name)
    if not isinstance(result, dict) or not result.get("success"):
        return result
    repos = result.get("repositories", [])
    
    # Extract unique owners before filtering
    owners = sorted(list(set(r.get("owner") or "N/A" for r in repos)))
    
    if owner and owner != "All":
        repos = [r for r in repos if (r.get("owner") or "N/A") == owner]
        
    total_count = len(repos)
    start = (page - 1) * page_size
    end = start + page_size
    sliced = repos[start:end]
    
    return {
        "success": True,
        "total_count": total_count,
        "count": len(sliced),
        "repositories": sliced,
        "owners": owners
    }


@router.get("/projects/{project_name}/repos/{repo_name}/files")
async def get_files(project_name: str, repo_name: str):
    return fetch_files(project_name, repo_name)


@router.get("/projects/{project_name}/repos/{repo_name}/commits")
async def get_commits(project_name: str, repo_name: str, page: int = 1, page_size: int = 10):
    result = fetch_commits(project_name, repo_name)
    if not isinstance(result, dict) or not result.get("success"):
        return result
    commits = result.get("commits", [])
    total_count = len(commits)
    start = (page - 1) * page_size
    end = start + page_size
    sliced = commits[start:end]
    return {
        "success": True,
        "total_count": total_count,
        "count": len(sliced),
        "commits": sliced
    }


@router.get("/projects/{project_name}/repos/{repo_name}/pushes")
async def get_pushes(project_name: str, repo_name: str, page: int = 1, page_size: int = 10):
    result = fetch_pushes(project_name, repo_name)
    if not isinstance(result, dict) or not result.get("success"):
        return result
    pushes = result.get("pushes", [])
    total_count = len(pushes)
    start = (page - 1) * page_size
    end = start + page_size
    sliced = pushes[start:end]
    return {
        "success": True,
        "total_count": total_count,
        "count": len(sliced),
        "pushes": sliced
    }


@router.get("/projects/{project_name}/repos/{repo_name}/branches")
async def get_branches(project_name: str, repo_name: str, page: int = 1, page_size: int = 10):
    result = fetch_branches(project_name, repo_name)
    if not isinstance(result, dict) or not result.get("success"):
        return result
    branches = result.get("branches", [])
    total_count = len(branches)
    start = (page - 1) * page_size
    end = start + page_size
    sliced = branches[start:end]
    return {
        "success": True,
        "total_count": total_count,
        "count": len(sliced),
        "branches": sliced
    }


@router.get("/projects/{project_name}/repos/{repo_name}/tags")
async def get_tags(project_name: str, repo_name: str):
    return fetch_tags(project_name, repo_name)


@router.get("/projects/{project_name}/repos/{repo_name}/pullrequests")
async def get_pull_requests(project_name: str, repo_name: str, page: int = 1, page_size: int = 10):
    result = fetch_pull_requests(project_name, repo_name)
    if not isinstance(result, dict) or not result.get("success"):
        return result
    prs = result.get("pullRequests", [])
    total_count = len(prs)
    start = (page - 1) * page_size
    end = start + page_size
    sliced = prs[start:end]
    return {
        "success": True,
        "total_count": total_count,
        "count": len(sliced),
        "pullRequests": sliced
    }