from fastapi import APIRouter
from services.Azure_Devops.projects_service import fetch_projects
from services.Azure_Devops.pipelines_service import fetch_pipelines
from services.Azure.azure_auth import get_azure_token
from core.data_cache import cache

import requests

router = APIRouter(prefix="/status", tags=["Status"])


def _check_azure_service(url: str, token: str) -> str:
    """Return 'Healthy' if the Azure Management URL responds, else 'Warning'.
    404 is accepted — endpoint is reachable, resource just doesn't exist."""
    try:
        resp = requests.get(
            url,
            headers={"Authorization": f"Bearer {token}"},
            timeout=8
        )
        return "Healthy" if resp.status_code in (200, 404) else "Warning"
    except Exception:
        return "Warning"


@router.get("/services")
async def get_services_status():

    # ── 1. Azure DevOps ──────────────────────────────────────────────────────
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

    # ── 2. CI/CD Pipelines ───────────────────────────────────────────────────
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

    # ── 3–5. Azure platform services (each independently probed) ─────────────
    azure_services = []
    try:
        token = get_azure_token()

        # 3. Azure Subscriptions — core ARM subscriptions listing
        subs_status = _check_azure_service(
            "https://management.azure.com/subscriptions?api-version=2020-01-01",
            token
        )

        # 4. Azure Cost Management — provider registration check
        cost_status = _check_azure_service(
            "https://management.azure.com/providers/Microsoft.CostManagement?api-version=2021-04-01",
            token
        )

        # 5. Azure Resource Manager — ARM providers endpoint (top=1 for speed)
        arm_status = _check_azure_service(
            "https://management.azure.com/providers?api-version=2021-04-01&$top=1",
            token
        )

        azure_services = [
            {"service": "Azure Subscriptions",   "status": subs_status},
            {"service": "Azure Cost Management",  "status": cost_status},
            {"service": "Azure Resource Manager", "status": arm_status},
        ]

    except Exception:
        # Token acquisition failed — all Azure platform services are unreachable
        azure_services = [
            {"service": "Azure Subscriptions",   "status": "Warning"},
            {"service": "Azure Cost Management",  "status": "Warning"},
            {"service": "Azure Resource Manager", "status": "Warning"},
        ]

    return [
        {"service": "Azure DevOps",    "status": devops_status},
        {"service": "CI/CD Pipelines", "status": pipelines_status},
        *azure_services,
    ]

@router.get("/api/debug/cache")
def check_cache_health():
    # This runs your thread-safe dictionary scanner
    return cache.stats()