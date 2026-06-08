from fastapi import APIRouter

from app.services.Azure_Devops.boards_service import fetch_work_items

router = APIRouter(tags=["Boards"])

@router.get("/project/{project_name}/workitems")
async def get_work_items(project_name):
    return fetch_work_items(project_name)

@router.get("/projects/{project_name}/workitems")
async def get_projects_work_items(project_name):
    return fetch_work_items(project_name)