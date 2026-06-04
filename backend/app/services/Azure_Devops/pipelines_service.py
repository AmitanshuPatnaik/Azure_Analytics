import requests
from requests.auth import HTTPBasicAuth
import urllib3

from app.core.config import base_url, collection, pat
from app.services.Azure_Devops.projects_service import fetch_projects
from app.exceptions.handler import handle_error_response
from app.core.auth import auth
from app.core.constants import API_VERSION, RESOURCE_PIPELINE

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def fetch_pipelines(project_name):
    url = f"{base_url}/{collection}/{project_name}/_apis/pipelines?api-version={API_VERSION}"

    response = requests.get(url=url, auth=auth, verify=False)

    if response.status_code != 200:
        return handle_error_response(response, f"{RESOURCE_PIPELINE} in project '{project_name}'")
    
    pipelines = []

    for pipeline in response.json()["value"]:
        pipelines.append({
            "id" : pipeline["id"],
            "name" : pipeline["name"],
            "folder" : pipeline.get("folder"),
            "url" : pipeline["url"]
        })

    return {
        "success" : True,
        "count" : len(pipelines),
        "pipelines" : pipelines
    }