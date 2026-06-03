import requests
from requests.auth import HTTPBasicAuth
import urllib3
import os
from dotenv import load_dotenv

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

load_dotenv()

base_url = os.getenv("AZURE_DEVOPS_URL")
collection = os.getenv("AZURE_COLLECTION_NAME")
pat = os.getenv("AZURE_PAT")


def fetch_projects():
    url = f"{base_url}/{collection}/_apis/projects?api-version=7.1"
    auth = HTTPBasicAuth("", pat)

    response = requests.get(url,auth=auth,verify=False)

    if response.status_code != 200:
        return {
            "success": False,
            "status_code": response.status_code,
            "error": response.text
        }

    projects = []

    for project in response.json()["value"]:
        projects.append({
            "id": project["id"],
            "name": project["name"],
            "description": project.get("description"),
            "state": project.get("state"),
            "visibility": project.get("visibility"),
            "url": project.get("url")
        })

    return {
        "success": True,
        "count": len(projects),
        "projects": projects
    }
