import requests
from requests.auth import HTTPBasicAuth
import urllib3

from app.core.config import base_url, collection, pat
from app.services.Azure_Devops.projects_service import fetch_projects
from app.exceptions.handler import handle_error_response
from app.core.auth import auth
from app.core.constants import API_VERSION, RESOURCE_TESTPLAN

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def fetch_test_plans(project_name):
    url = f"{base_url}/{collection}/{project_name}/_apis/testplan/plans/?api-version={API_VERSION}-preview.1"

    response = requests.get(url=url, auth=auth, verify=False)

    if response.status_code != 200:
        return handle_error_response(response, f"{RESOURCE_TESTPLAN} in project '{project_name}'")
    
    tps = []

    for tp in response.json()["value"]:
        tps.append({
            "id": tp["id"],
            "name": tp["name"],
            "owner" : tp["owner"]["displayName"],
            "state": tp["state"],
            "areaPath": tp.get("areaPath"),
            "iteration": tp.get("iteration"),
            "startDate" : tp["startDate"],
            "endDate" : tp["endDate"]
        })

    return {
        "success" : True,
        "count" : len(tps),
        "test_plans" : tps
    }