import requests
from requests.auth import HTTPBasicAuth
import urllib3
from urllib.parse import quote
from fastapi.responses import JSONResponse
from datetime import datetime

from core.config import base_url, collection, pat
from services.Azure_Devops.projects_service import fetch_projects
from exceptions.handler import handle_error_response
from core.auth import auth
from core.constants import API_VERSION, RESOURCE_REPOSITORY

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def fetch_repositories(project_name):
    if not base_url or not collection or not pat:
        return {
            "success": False,
            "message": "Azure DevOps is not configured. Please check config.json.",
            "repositories": []
        }
    try:
        url = f"{base_url}/{collection}/{project_name}/_apis/git/repositories?api-version={API_VERSION}"
        response = requests.get(url=url, auth=auth, verify=False, timeout=10)

        if response.status_code != 200:
            return handle_error_response(response, f"{RESOURCE_REPOSITORY}")
        
        repos = []
        data = response.json()
        for repo in data.get("value", []):
            if not isinstance(repo, dict):
                continue
            proj_info = repo.get("project")
            proj_name = proj_info.get("name") if isinstance(proj_info, dict) else "Unknown"
            
            repos.append({
                "id": repo.get("id"),
                "name": repo.get("name"),
                "project": proj_name,
                "defaultBranch": repo.get("defaultBranch"),
                "remoteUrl": repo.get("remoteUrl"),
            })

        return {
            "success": True,
            "count": len(repos),
            "repositories": repos
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to fetch repositories: {str(e)}",
            "repositories": []
        }


def fetch_all_repositories():
    if not base_url or not collection or not pat:
        return {
            "success": False,
            "message": "Azure DevOps is not configured. Please check config.json.",
            "repositories": []
        }
    try:
        projects = fetch_projects()

        if isinstance(projects, JSONResponse):
            return projects

        all_repos = []

        for project in projects.get("projects", []):
            if not isinstance(project, dict):
                continue
            project_name = project.get("name")
            if not project_name:
                continue
            repos = fetch_repositories(project_name)

            if isinstance(repos, JSONResponse) or not isinstance(repos, dict) or not repos.get("success"):
                continue

            all_repos.extend(repos.get("repositories", []))

        return {
            "success": True,
            "count": len(all_repos),
            "repositories": all_repos
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to fetch all repositories: {str(e)}",
            "repositories": []
        }


def fetch_files(project_name, repo_name):
    if not base_url or not collection or not pat:
        return {
            "success": False,
            "message": "Azure DevOps is not configured. Please check config.json."
        }
    try:
        url = f"{base_url}/{collection}/{project_name}/_apis/git/repositories/{repo_name}/items?scopePath=/&recursionLevel=Full&api-version={API_VERSION}"
        response = requests.get(url=url, auth=auth, verify=False, timeout=10)

        if response.status_code != 200:
            return handle_error_response(response, f"Repository '{repo_name}'")
        
        return response.json()
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to fetch files: {str(e)}"
        }


def fetch_commits(project_name, repo_name):
    if not base_url or not collection or not pat:
        return {
            "success": False,
            "message": "Azure DevOps is not configured. Please check config.json.",
            "commits": []
        }
    try:
        url = f"{base_url}/{collection}/{project_name}/_apis/git/repositories/{repo_name}/commits?api-version={API_VERSION}"
        response = requests.get(url=url, auth=auth, verify=False, timeout=10)

        if response.status_code != 200:
            return handle_error_response(response, f"Repository '{repo_name}'")
        
        commits = []
        data = response.json()
        for commit in data.get("value", []):
            if not isinstance(commit, dict):
                continue
            author_info = commit.get("author")
            author_name = author_info.get("name", "Unknown") if isinstance(author_info, dict) else "Unknown"
            author_email = author_info.get("email", "Unknown") if isinstance(author_info, dict) else "Unknown"
            author_date = author_info.get("date") if isinstance(author_info, dict) else None

            commits.append({
                "commitId": commit.get("commitId"),
                "author": author_name,
                "email": author_email,
                "date": author_date,
                "comment": commit.get("comment")
            })

        return {
            "success" : True,
            "count" : len(commits),
            "commits" : commits
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to fetch commits: {str(e)}",
            "commits": []
        }


def fetch_pushes(project_name, repo_name):
    if not base_url or not collection or not pat:
        return {
            "success": False,
            "message": "Azure DevOps is not configured. Please check config.json.",
            "pushes": []
        }
    try:
        url = f"{base_url}/{collection}/{project_name}/_apis/git/repositories/{repo_name}/pushes?api-version={API_VERSION}"
        response = requests.get(url=url, auth=auth, verify=False, timeout=10)

        if response.status_code != 200:
            return handle_error_response(response, f"Repository '{repo_name}'")
        
        pushes = []
        data = response.json()
        for push in data.get("value", []):
            if not isinstance(push, dict):
                continue
            pushed_by_info = push.get("pushedBy")
            pushed_by_name = pushed_by_info.get("displayName", "Unknown") if isinstance(pushed_by_info, dict) else "Unknown"

            pushes.append({
                "pushId": push.get("pushId"),
                "date": push.get("date"),
                "pushedBy": pushed_by_name
            })

        return {
            "success" : True,
            "count" : len(pushes),
            "pushes" : pushes
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to fetch pushes: {str(e)}",
            "pushes": []
        }


def _fmt_date(iso_str: str) -> str:
    """Convert an ISO date string (2025-07-15T...) to '15 Jul 2025'."""
    try:
        dt = datetime.fromisoformat(iso_str.split("T")[0])
        return dt.strftime("%-d %b %Y")  # Linux/Mac
    except Exception:
        try:
            dt = datetime.strptime(iso_str.split("T")[0], "%Y-%m-%d")
            return f"{dt.day} {dt.strftime('%b')} {dt.year}"
        except Exception:
            return iso_str.split("T")[0]


def fetch_branches(project_name, repo_name):
    if not base_url or not collection or not pat:
        return {
            "success": False,
            "message": "Azure DevOps is not configured. Please check config.json.",
            "branches": []
        }

    try:
        url = (
            f"{base_url}/{collection}/{project_name}"
            f"/_apis/git/repositories/{repo_name}"
            f"/refs?filter=heads/&api-version={API_VERSION}"
        )

        response = requests.get(
            url=url,
            auth=auth,
            verify=False,
            timeout=10
        )

        if response.status_code != 200:
            return handle_error_response(
                response,
                f"Repository '{repo_name}'"
            )

        branches = []

        for branch in response.json().get("value", []):

            if not isinstance(branch, dict):
                continue

            full_branch_name = branch.get("name", "")

            branch_name = full_branch_name.replace(
                "refs/heads/",
                ""
            )

            encoded_branch = quote(branch_name)

            owner = None
            created_date = None
            last_modified_by = None
            last_modified_date = None

            latest_commit_url = (
                f"{base_url}/{collection}/{project_name}"
                f"/_apis/git/repositories/{repo_name}"
                f"/commits"
                f"?searchCriteria.itemVersion.version={encoded_branch}"
                f"&$top=1"
                f"&api-version={API_VERSION}"
            )

            latest_response = requests.get(
                url=latest_commit_url,
                auth=auth,
                verify=False,
                timeout=10
            )

            if latest_response.status_code == 200:

                commits = latest_response.json().get(
                    "value",
                    []
                )

                if commits:

                    latest_commit = commits[0]

                    last_modified_by = (
                        latest_commit
                        .get("author", {})
                        .get("name")
                    )

                    raw_date = (
                        latest_commit
                        .get("author", {})
                        .get("date")
                    )

                    if raw_date:
                        last_modified_date = _fmt_date(
                            raw_date
                        )

            pushes_url = (
                f"{base_url}/{collection}/{project_name}"
                f"/_apis/git/repositories/{repo_name}"
                f"/pushes"
                f"?searchCriteria.refName=refs/heads/{encoded_branch}"
                f"&searchCriteria.order=asc"
                f"&$top=1"
                f"&api-version={API_VERSION}"
            )

            pushes_response = requests.get(
                url=pushes_url,
                auth=auth,
                verify=False,
                timeout=10
            )

            if pushes_response.status_code == 200:

                pushes = pushes_response.json().get(
                    "value",
                    []
                )

                if pushes:

                    first_push = pushes[0]

                    owner = (
                        first_push
                        .get("pushedBy", {})
                        .get("displayName")
                    )

                    raw_date = first_push.get("date")

                    if raw_date:
                        created_date = _fmt_date(
                            raw_date
                        )

            branches.append({
                "name": branch_name,
                "owner": owner,
                "createdDate": created_date,
                "lastModifiedBy": last_modified_by,
                "lastModifiedDate": last_modified_date
            })

        return {
            "success": True,
            "count": len(branches),
            "branches": branches
        }

    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to fetch branches: {str(e)}",
            "branches": []
        }

def fetch_tags(project_name, repo_name):
    if not base_url or not collection or not pat:
        return {
            "success": False,
            "message": "Azure DevOps is not configured. Please check config.json.",
            "tags": []
        }
    try:
        url = f"{base_url}/{collection}/{project_name}/_apis/git/repositories/{repo_name}/refs?filter=tags/&api-version={API_VERSION}"
        response = requests.get(url=url, auth=auth, verify=False, timeout=10)

        if response.status_code != 200:
            return handle_error_response(response, f"Repository '{repo_name}'")

        tags = []
        data = response.json()
        for tag in data.get("value", []):
            if not isinstance(tag, dict):
                continue
            tags.append({
                "name": tag.get("name"),
                "objectId": tag.get("objectId")
            })

        return {
            "success": True,
            "count": len(tags),
            "tags": tags
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to fetch tags: {str(e)}",
            "tags": []
        }


def fetch_pull_requests(project_name, repo_name):
    if not base_url or not collection or not pat:
        return {
            "success": False,
            "message": "Azure DevOps is not configured. Please check config.json.",
            "pullRequests": []
        }
    try:
        url = f"{base_url}/{collection}/{project_name}/_apis/git/repositories/{repo_name}/pullrequests?searchCriteria.status=all&api-version={API_VERSION}"
        response = requests.get(url=url, auth=auth, verify=False, timeout=10)

        if response.status_code != 200:
            return handle_error_response(response, f"Repository '{repo_name}'")

        prs = []
        data = response.json()
        for pr in data.get("value", []):
            if not isinstance(pr, dict):
                continue
            created_by_info = pr.get("createdBy")
            created_by_name = created_by_info.get("displayName", "Unknown") if isinstance(created_by_info, dict) else "Unknown"

            prs.append({
                "pullRequestId": pr.get("pullRequestId"),
                "title": pr.get("title"),
                "status": pr.get("status"),
                "description" : pr.get("description"),
                "createdBy": created_by_name,
                "creationDate": pr.get("creationDate"),
                "closedDate" : pr.get("closedDate"),
                "sourceBranch": pr.get("sourceRefName"),
                "targetBranch": pr.get("targetRefName"),
                "mergeStatus" : pr.get("mergeStatus")
            })

        return {
            "success": True,
            "count": len(prs),
            "pullRequests": prs
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to fetch pull requests: {str(e)}",
            "pullRequests": []
        }
