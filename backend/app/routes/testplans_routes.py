from fastapi import APIRouter

from services.Azure_Devops.testplans_service import fetch_test_plans

router = APIRouter(tags=["Test Plans"])

@router.get("/project/{project_name}/testplans")
async def get_test_plans(project_name):
    return fetch_test_plans(project_name)

@router.get("/projects/{project_name}/testplans")
async def get_projects_test_plans(project_name):
    return fetch_test_plans(project_name)