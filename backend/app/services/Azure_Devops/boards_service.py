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
            "query": f"""
            SELECT [System.Id]
            FROM WorkItems
            WHERE [System.TeamProject] = '{project_name}'
              AND [System.WorkItemType] <> ''
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


def fetch_sprints(project_name):
    """Return a list of sprint names for the given project."""
    if not base_url or not collection or not pat:
        return []
    try:
        url = f"{base_url}/{collection}/{project_name}/_apis/work/teamsettings/iterations?api-version={API_VERSION}"
        response = requests.get(url=url, auth=auth, verify=False, timeout=10)
        if response.status_code != 200:
            return []
        data = response.json()
        return [
            it.get("name", "")
            for it in data.get("value", [])
            if isinstance(it, dict) and it.get("name")
        ]
    except Exception:
        return []


def fetch_work_items(project_name):
    if not base_url or not collection or not pat:
        return {
            "success": False,
            "message": "Azure DevOps is not configured. Please check config.json.",
            "count": 0,
            "value": [],
            "sprints": []
        }
    try:
        ids = fetch_work_item_ids(project_name)

        if not ids:
            return {
                "success": False,
                "message": "No work items found",
                "count": 0,
                "value": [],
                "sprints": []
            }

        ids_string = ",".join(map(str, ids[:200]))

        # Fetch all fields required by the sample JSON response format
        fields_param = (
            "System.Id,System.WorkItemType,System.Title,System.State,"
            "System.BoardColumn,System.AssignedTo,"
            "Microsoft.VSTS.Common.Priority,"
            "Microsoft.VSTS.Common.Severity,"
            "Microsoft.VSTS.Common.StateChangeDate,"
            "Microsoft.VSTS.Scheduling.StartDate,"
            "Microsoft.VSTS.Scheduling.TargetDate,"
            "Microsoft.VSTS.Scheduling.OriginalEstimate,"
            "Microsoft.VSTS.Scheduling.CompletedWork,"
            "Microsoft.VSTS.Scheduling.RemainingWork,"
            "System.IterationPath"
        )

        url = (
            f"{base_url}/{collection}/_apis/wit/workitems"
            f"?ids={ids_string}"
            f"&fields={fields_param}"
            f"&api-version={API_VERSION}"
        )
        auth_basic = HTTPBasicAuth("", pat)

        response = requests.get(url, auth=auth_basic, verify=False, timeout=10)

        if response.status_code != 200:
            return handle_error_response(response, f"{RESOURCE_WORKITEM} in project '{project_name}'")

        raw_items = []
        sprint_set = set()
        data = response.json()

        for item in data.get("value", []):
            if not isinstance(item, dict):
                continue
            fields = item.get("fields", {})
            if not isinstance(fields, dict):
                fields = {}

            # Extract sprint from iteration path for grouping
            iteration_path = fields.get("System.IterationPath", "")
            sprint = iteration_path.split("\\")[-1] if iteration_path else "No Sprint"
            if sprint:
                sprint_set.add(sprint)

            # Build the fields object matching the sample JSON format
            assigned_to_raw = fields.get("System.AssignedTo")
            assigned_to = (
                {
                    "displayName": assigned_to_raw.get("displayName"),
                    "uniqueName": assigned_to_raw.get("uniqueName")
                }
                if isinstance(assigned_to_raw, dict)
                else None
            )

            # Only include optional fields when they are present
            out_fields = {
                "System.Id": fields.get("System.Id"),
                "System.WorkItemType": fields.get("System.WorkItemType"),
                "System.Title": fields.get("System.Title"),
                "System.State": fields.get("System.State"),
                "System.BoardColumn": fields.get("System.BoardColumn"),
                "System.AssignedTo": assigned_to,
                "Microsoft.VSTS.Common.Priority": fields.get("Microsoft.VSTS.Common.Priority"),
                "Microsoft.VSTS.Common.StateChangeDate": fields.get("Microsoft.VSTS.Common.StateChangeDate"),
                # Sprint stored internally for frontend grouping
                "_sprint": sprint,
            }

            # Optional fields — only add when non-null
            for opt_key in (
                "Microsoft.VSTS.Common.Severity",
                "Microsoft.VSTS.Scheduling.StartDate",
                "Microsoft.VSTS.Scheduling.TargetDate",
                "Microsoft.VSTS.Scheduling.OriginalEstimate",
                "Microsoft.VSTS.Scheduling.CompletedWork",
                "Microsoft.VSTS.Scheduling.RemainingWork",
            ):
                val = fields.get(opt_key)
                if val is not None:
                    out_fields[opt_key] = val

            raw_items.append({
                "id":  item.get("id"),
                "rev": item.get("rev"),
                "fields": out_fields,
            })

        sprints = sorted(sprint_set)

        return {
            "success": True,
            "count":   len(raw_items),
            "value":   raw_items,
            "sprints": sprints,
        }
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to fetch work items: {str(e)}",
            "count": 0,
            "value": [],
            "sprints": []
        }