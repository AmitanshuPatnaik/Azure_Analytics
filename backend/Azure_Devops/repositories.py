import requests
from requests.auth import HTTPBasicAuth
import urllib3
import os
from dotenv import load_dotenv

from Azure_Devops.projects import fetch_projects

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
        return {
            "success" : False,
            "status_code" : response.status_code,
            "error" : response.text
        }
    
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
        "success" : True,
        "count" : len(repos),
        "repositories" : repos
    }


def fetch_all_repositories():
    projects = fetch_projects()

    if not projects["success"]:
        return projects

    all_repos = []

    for project in projects["projects"]:
        project_name = project["name"]

        repos = fetch_repositories(project_name)

        if repos["success"]:
            for repo in repos["repositories"]:
                all_repos.append(repo)

    return {
        "success": True,
        "count": len(all_repos),
        "repositories": all_repos
    }