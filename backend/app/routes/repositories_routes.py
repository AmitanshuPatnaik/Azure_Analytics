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
async def get_all_repositories():
    return cache.get("repos", _COLD_CACHE_RESPONSE)


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