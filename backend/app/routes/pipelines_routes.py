from fastapi import APIRouter

from services.Azure_Devops.pipelines_service import fetch_pipelines, fetch_active_pipelines_count

router = APIRouter(tags=["Pipelines"])

@router.get("/projects/{project_name}/pipelines")
async def get_pipelines(project_name: str):
    return fetch_pipelines(project_name)

@router.get("/pipelines/active-count")
async def get_active_pipelines_count():
    return fetch_active_pipelines_count()