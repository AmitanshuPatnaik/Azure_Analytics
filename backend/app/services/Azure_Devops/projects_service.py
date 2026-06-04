import requests
from requests.auth import HTTPBasicAuth
import urllib3

from app.core.config import base_url, collection, pat
from app.exceptions.handler import handle_error_response
from app.core.auth import auth
from app.core.constants import API_VERSION, RESOURCE_PROJECT

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def fetch_projects():
    url = f"{base_url}/{collection}/_apis/projects?api-version={API_VERSION}"

    response = requests.get(url,auth=auth,verify=False)

    if response.status_code != 200:
        return handle_error_response(response, f"{RESOURCE_PROJECT}")

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
