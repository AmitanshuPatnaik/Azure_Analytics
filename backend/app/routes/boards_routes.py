from fastapi import APIRouter

<<<<<<< HEAD
from app.services.Azure_Devops.boards_service import fetch_work_items
=======
from services.Azure_Devops.boards_service import fetch_work_items
>>>>>>> 81abce3 (Modified Backend imports)

router = APIRouter(tags=["Boards"])

@router.get("/project/{project_name}/workitems")
async def get_work_items(project_name):
    return fetch_work_items(project_name)

@router.get("/projects/{project_name}/workitems")
async def get_projects_work_items(project_name):
    return fetch_work_items(project_name)