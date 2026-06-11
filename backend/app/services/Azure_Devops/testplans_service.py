import requests
from requests.auth import HTTPBasicAuth
import urllib3

from core.config import base_url, collection, pat
from services.Azure_Devops.projects_service import fetch_projects
from exceptions.handler import handle_error_response
from core.auth import auth
from core.constants import API_VERSION, RESOURCE_TESTPLAN

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def fetch_test_plans(project_name):
    if not base_url or not collection or not pat:
        return {
            "success": False,
            "message": "Azure DevOps is not configured. Please check config.json.",
            "test_plans": []
        }
    try:
        url = f"{base_url}/{collection}/{project_name}/_apis/testplan/plans?api-version={API_VERSION}-preview.1"
        response = requests.get(url=url, auth=auth, verify=False, timeout=10)

        if response.status_code != 200:
            return handle_error_response(response, f"{RESOURCE_TESTPLAN} in project '{project_name}'")
        
        tps = []
        data = response.json()
        for tp in data.get("value", []):
            if not isinstance(tp, dict):
                continue
            owner_info = tp.get("owner")
            owner_name = owner_info.get("displayName", "Unassigned") if isinstance(owner_info, dict) else "Unassigned"

            tps.append({
                "id": tp.get("id"),
                "name": tp.get("name"),
                "owner": owner_name,
                "state": tp.get("state"),
                "areaPath": tp.get("areaPath"),
                "iteration": tp.get("iteration"),
                "startDate" : tp.get("startDate"),
                "endDate" : tp.get("endDate")
            })

        return {
            "success" : True,
            "count" : len(tps),
            "test_plans" : tps
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to fetch test plans: {str(e)}",
            "test_plans": []
        }