from fastapi import APIRouter

from app.services.Azure_Devops.pipelines_service import fetch_pipelines

router = APIRouter(tags=["Pipelines"])

@router.get("/projects/{project_name}/pipelines")
async def get_pipelines(project_name: str):
    return fetch_pipelines(project_name)