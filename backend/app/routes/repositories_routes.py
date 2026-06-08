from fastapi import APIRouter

from app.services.Azure_Devops.repositories_service import (
    fetch_all_repositories,
    fetch_branches,
    fetch_commits,
    fetch_files,
    fetch_pull_requests,
    fetch_pushes,
    fetch_repositories,
    fetch_tags
)

router = APIRouter(tags=["Repositories"])

@router.get("/repos")
async def get_all_repositories():
    return fetch_all_repositories()


@router.get("/projects/{project_name}/repos")
async def get_repositories(project_name):
    return fetch_repositories(project_name)


@router.get("/projects/{project_name}/repos/{repo_name}/files")
async def get_files(project_name, repo_name):
    return fetch_files(project_name, repo_name)


@router.get("/projects/{project_name}/repos/{repo_name}/commits")
async def get_commits(project_name, repo_name):
    return fetch_commits(project_name, repo_name)


@router.get("/projects/{project_name}/repos/{repo_name}/pushes")
async def get_pushes(project_name, repo_name):
    return fetch_pushes(project_name, repo_name)


@router.get("/projects/{project_name}/repos/{repo_name}/branches")
async def get_branches(project_name, repo_name):
    return fetch_branches(project_name, repo_name)


@router.get("/projects/{project_name}/repos/{repo_name}/tags")
async def get_tags(project_name, repo_name):
    return fetch_tags(project_name, repo_name)


@router.get("/projects/{project_name}/repos/{repo_name}/pullrequests")
async def get_pull_requests(project_name, repo_name):
    return fetch_pull_requests(project_name,repo_name)