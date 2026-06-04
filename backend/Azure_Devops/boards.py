import requests
from requests.auth import HTTPBasicAuth
import urllib3
import os
from dotenv import load_dotenv

from Azure_Devops.projects import fetch_projects
from Azure_Devops.error_handler import handle_error_response

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

load_dotenv()

base_url = os.getenv("AZURE_DEVOPS_URL")
collection = os.getenv("AZURE_COLLECTION_NAME")
pat = os.getenv("AZURE_PAT")

auth = HTTPBasicAuth("", pat)


def fetch_work_item_ids(project_name):
    url = f"{base_url}/{collection}/{project_name}/_apis/wit/wiql?api-version=7.1"

    query = {
        "query": """
        SELECT [System.Id]
        FROM WorkItems
        ORDER BY [System.ChangedDate] DESC
        """
    }

    response = requests.post(url=url, json=query, auth=auth, verify=False)

    if response.status_code != 200:
        return []

    return [item["id"] for item in response.json()["workItems"]]


def fetch_work_items(project_name):
    ids = fetch_work_item_ids(project_name)

    if not ids:
        return {
            "success": False,
            "message": "No work items found"
        }

    ids_string = ",".join(map(str, ids[:100]))

    url = f"{base_url}/{collection}/_apis/wit/workitems?ids={ids_string}&api-version=7.1"
    auth = HTTPBasicAuth("", pat)

    response = requests.get(url, auth=auth, verify=False)

    if response.status_code != 200:
        return handle_error_response(response, f"Work Items in project '{project_name}'")

    work_items = []

    for item in response.json()["value"]:
        fields = item["fields"]

        work_items.append({
            "id": item["id"],
            "title": fields.get("System.Title"),
            "type": fields.get("System.WorkItemType"),
            "state": fields.get("System.State"),
            "assignedTo": fields.get("System.AssignedTo", {}).get("displayName")
                if isinstance(fields.get("System.AssignedTo"),dict)
                else None,
            "createdDate": fields.get("System.CreatedDate")
        })

    return {
        "success": True,
        "count": len(work_items),
        "workItems": work_items
    }