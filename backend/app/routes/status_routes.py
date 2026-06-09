from fastapi import APIRouter
from app.services.Azure_Devops.projects_service import fetch_projects
from app.services.Azure_Devops.pipelines_service import fetch_pipelines
from app.services.Azure.subscriptions import fetch_subscriptions

router = APIRouter(prefix="/status", tags=["Status"])

@router.get("/services")
async def get_services_status():
    # 1. Check Azure DevOps Projects connectivity
    devops_status = "Healthy"
    projects = []
    try:
        proj_res = fetch_projects()
        if isinstance(proj_res, dict) and proj_res.get("success"):
            projects = proj_res.get("projects", [])
        else:
            devops_status = "Warning"
    except Exception:
        devops_status = "Warning"

    # 2. Check Pipelines connectivity
    pipelines_status = "Healthy"
    try:
        if devops_status == "Healthy" and projects:
            first_project = projects[0]["name"]
            pipelines_res = fetch_pipelines(first_project)
            if not (isinstance(pipelines_res, dict) and pipelines_res.get("success")):
                pipelines_status = "Warning"
        else:
            pipelines_status = "Warning"
    except Exception:
        pipelines_status = "Warning"

    # 3. Check Azure Connection Indicator (Monitor, Storage, AKS Cluster)
    azure_connected = False
    try:
        subs_res = fetch_subscriptions()
        if isinstance(subs_res, dict) and len(subs_res.get("subscriptions", [])) > 0:
            azure_connected = True
        elif isinstance(subs_res, list) and len(subs_res) > 0:
            azure_connected = True
    except Exception:
        pass

    azure_status = "Healthy" if azure_connected else "Warning"

    return [
        {"service": "Azure DevOps", "status": devops_status},
        {"service": "CI/CD Pipelines", "status": pipelines_status},
        {"service": "Azure Monitor", "status": azure_status},
        {"service": "Azure Storage", "status": azure_status},
        {"service": "AKS Cluster", "status": azure_status}
    ]
