import requests
from requests.auth import HTTPBasicAuth
import urllib3
import os
from dotenv import load_dotenv
from fastapi.responses import JSONResponse

from Azure_Devops.projects import fetch_projects
from Azure_Devops.error_handler import handle_error_response

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

load_dotenv()

base_url = os.getenv("AZURE_DEVOPS_URL")
collection = os.getenv("AZURE_COLLECTION_NAME")
pat = os.getenv("AZURE_PAT")

auth = HTTPBasicAuth("", pat)


def fetch_repositories(project_name):
    url = f"{base_url}/{collection}/{project_name}/_apis/git/repositories?api-version=7.1"

    response = requests.get(url=url, auth=auth, verify=False)

    if response.status_code != 200:
        return handle_error_response(response, "Repository")
    
    repos = []

    for repo in response.json().get("value"):
        repos.append({
            "id": repo["id"],
            "name": repo["name"],
            "project": repo["project"]["name"],
            "defaultBranch": repo.get("defaultBranch"),
            "remoteUrl": repo.get("remoteUrl"),
        })

    return {
        "count": len(repos),
        "repositories": repos
    }


def fetch_all_repositories():
    projects = fetch_projects()

    if isinstance(projects, JSONResponse):
        return projects

    all_repos = []

    for project in projects["projects"]:
        project_name = project["name"]
        repos = fetch_repositories(project_name)

        if isinstance(repos, JSONResponse):
            continue

        all_repos.extend(repos["repositories"])

    return {
        "count": len(all_repos),
        "repositories": all_repos
    }


def fetch_files(project_name, repo_name):
    url = f"{base_url}/{collection}/{project_name}/_apis/git/repositories/{repo_name}/items?scopePath=/&recursionLevel=Full&api-version=7.1"

    response = requests.get(url=url, auth=auth, verify=False)

    if response.status_code != 200:
        return handle_error_response(response, f"Repository '{repo_name}'")
    
    return response.json()


def fetch_commits(project_name, repo_name):
    url = f"{base_url}/{collection}/{project_name}/_apis/git/repositories/{repo_name}/commits?api-version=7.1"

    response = requests.get(url=url, auth=auth, verify=False)

    if response.status_code != 200:
        return handle_error_response(response, f"Repository '{repo_name}'")
    
    commits = []

    for commit in response.json()["value"]:
        commits.append({
            "commitId": commit["commitId"],
            "author": commit["author"]["name"],
            "email": commit["author"]["email"],
            "date": commit["author"]["date"],
            "comment": commit.get("comment")
        })

    return {
        "success" : True,
        "count" : len(commits),
        "commits" : commits
    }


def fetch_pushes(project_name, repo_name):
    url = f"{base_url}/{collection}/{project_name}/_apis/git/repositories/{repo_name}/pushes?api-version=7.1"

    response = requests.get(url=url, auth=auth, verify=False)

    if response.status_code != 200:
        return handle_error_response(response, f"Repository '{repo_name}'")
    
    pushes = []

    for push in response.json()["value"]:
        pushes.append({
            "pushId": push["pushId"],
            "date": push["date"],
            "pushedBy": push["pushedBy"]["displayName"]
        })

    return {
        "success" : True,
        "count" : len(pushes),
        "pushes" : pushes
    }


def fetch_branches(project_name, repo_name):

    url = f"{base_url}/{collection}/{project_name}/_apis/git/repositories/{repo_name}/refs?filter=heads/&api-version=7.1"

    response = requests.get(url=url,auth=auth,verify=False)

    if response.status_code != 200:
        return handle_error_response(response, f"Repository '{repo_name}'")

    branches = []

    for branch in response.json()["value"]:
        branches.append({
            "name": branch["name"],
            "objectId": branch["objectId"]
        })

    return {
        "success": True,
        "count": len(branches),
        "branches": branches
    }


def fetch_tags(project_name, repo_name):
    url = f"{base_url}/{collection}/{project_name}/_apis/git/repositories/{repo_name}/refs?filter=tags/&api-version=7.1"

    response = requests.get(url=url,auth=auth,verify=False)

    if response.status_code != 200:
        return handle_error_response(response, f"Repository '{repo_name}'")

    tags = []

    for tag in response.json()["value"]:
        tags.append({
            "name": tag["name"],
            "objectId": tag["objectId"]
        })

    return {
        "success": True,
        "count": len(tags),
        "tags": tags
    }


def fetch_pull_requests(project_name, repo_name):
    url = f"{base_url}/{collection}/{project_name}/_apis/git/repositories/{repo_name}/pullrequests?searchCriteria.status=all&api-version=7.1"

    response = requests.get(url=url,auth=auth,verify=False)

    if response.status_code != 200:
        return handle_error_response(response, f"Repository '{repo_name}'")

    prs = []

    for pr in response.json()["value"]:
        prs.append({
            "pullRequestId": pr["pullRequestId"],
            "title": pr["title"],
            "status": pr["status"],
            "createdBy": pr["createdBy"]["displayName"],
            "creationDate": pr["creationDate"],
            "sourceBranch": pr["sourceRefName"],
            "targetBranch": pr["targetRefName"]
        })

    return {
        "success": True,
        "count": len(prs),
        "pullRequests": prs
    }
