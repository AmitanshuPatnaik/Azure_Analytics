from fastapi import APIRouter

from app.services.Azure_Devops.testplans_service import fetch_test_plans

router = APIRouter(tags=["Test Plans"])

@router.get("/project/{project_name}/testplans")
async def get_test_plans(project_name):
    return fetch_test_plans(project_name)