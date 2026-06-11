import requests
from requests.auth import HTTPBasicAuth
import urllib3

<<<<<<< HEAD
from app.core.config import base_url, collection, pat
from app.exceptions.handler import handle_error_response
from app.core.auth import auth
from app.core.constants import API_VERSION, RESOURCE_PROJECT
=======
from core.config import base_url, collection, pat
from exceptions.handler import handle_error_response
from core.auth import auth
from core.constants import API_VERSION, RESOURCE_PROJECT
>>>>>>> 81abce3 (Modified Backend imports)

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def fetch_projects():
    if not base_url or not collection or not pat:
        return {
            "success": False,
            "message": "Azure DevOps is not configured. Please check config.json.",
            "projects": []
        }
    try:
        url = f"{base_url}/{collection}/_apis/projects?api-version={API_VERSION}"
        response = requests.get(url, auth=auth, verify=False, timeout=10)

        if response.status_code != 200:
            return handle_error_response(response, f"{RESOURCE_PROJECT}")

        projects = []
        data = response.json()
        for project in data.get("value", []):
            if not isinstance(project, dict):
                continue
            proj_name = project.get("name", "")
            projects.append({
                "id": project.get("id"),
                "name": proj_name,
                "description": project.get("description"),
                "state": project.get("state"),
                "visibility": project.get("visibility"),
                "url": f"{base_url}/{collection}/{proj_name}" if proj_name else project.get("url")
            })

        return {
            "success": True,
            "count": len(projects),
            "projects": projects
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to fetch projects: {str(e)}",
            "projects": []
        }
