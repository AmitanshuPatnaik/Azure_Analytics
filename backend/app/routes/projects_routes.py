from fastapi import APIRouter

from app.services.Azure_Devops.projects_service import fetch_projects

router = APIRouter(prefix="/projects", tags=["Projects"])

@router.get("")
async def get_projects():
    return fetch_projects()