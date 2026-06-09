import requests
from requests.auth import HTTPBasicAuth
import urllib3

from app.core.config import base_url, collection, pat
from app.services.Azure_Devops.projects_service import fetch_projects
from app.exceptions.handler import handle_error_response
from app.core.auth import auth
from app.core.constants import API_VERSION, RESOURCE_WORKITEM

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)


def fetch_work_item_ids(project_name):
    if not base_url or not collection or not pat:
        return []
    try:
        url = f"{base_url}/{collection}/{project_name}/_apis/wit/wiql?api-version={API_VERSION}"

        query = {
            "query": """
            SELECT [System.Id]
            FROM WorkItems
            ORDER BY [System.ChangedDate] DESC
            """
        }

        response = requests.post(url=url, json=query, auth=auth, verify=False, timeout=10)

        if response.status_code != 200:
            return []

        data = response.json()
        return [item["id"] for item in data.get("workItems", []) if isinstance(item, dict) and "id" in item]
    except Exception:
        return []


def fetch_work_items(project_name):
    if not base_url or not collection or not pat:
        return {
            "success": False,
            "message": "Azure DevOps is not configured. Please check config.json.",
            "workItems": []
        }
    try:
        ids = fetch_work_item_ids(project_name)

        if not ids:
            return {
                "success": False,
                "message": "No work items found",
                "workItems": []
            }

        ids_string = ",".join(map(str, ids[:100]))

        url = f"{base_url}/{collection}/_apis/wit/workitems?ids={ids_string}&api-version={API_VERSION}"
        auth_basic = HTTPBasicAuth("", pat)

        response = requests.get(url, auth=auth_basic, verify=False, timeout=10)

        if response.status_code != 200:
            return handle_error_response(response, f"{RESOURCE_WORKITEM} in project '{project_name}'")

        work_items = []
        data = response.json()
        for item in data.get("value", []):
            if not isinstance(item, dict):
                continue
            fields = item.get("fields", {})
            if not isinstance(fields, dict):
                fields = {}

            assigned_to_info = fields.get("System.AssignedTo")
            assigned_to_name = assigned_to_info.get("displayName") if isinstance(assigned_to_info, dict) else None

            work_items.append({
                "id": item.get("id"),
                "title": fields.get("System.Title"),
                "type": fields.get("System.WorkItemType"),
                "state": fields.get("System.State"),
                "assignedTo": assigned_to_name,
                "createdDate": fields.get("System.CreatedDate"),
                "description" : fields.get("System.Description")
            })

        return {
            "success": True,
            "count": len(work_items),
            "workItems": work_items
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to fetch work items: {str(e)}",
            "workItems": []
        }