from fastapi import APIRouter, Query

from services.Azure_Devops.boards_service import fetch_work_items, fetch_recent_state_changes

router = APIRouter(tags=["Boards"])

@router.get("/project/{project_name}/workitems")
async def get_work_items(project_name):
    return fetch_work_items(project_name)

@router.get("/projects/{project_name}/workitems")
async def get_projects_work_items(project_name):
    return fetch_work_items(project_name)

@router.get("/boards/{project}/recent-changes")
async def get_recent_changes(
    project: str,
    days: int = Query(default=30, ge=1, le=180, description="Look-back window in days"),
    limit: int = Query(default=25, ge=1, le=100, description="Max items to return"),
):
    return fetch_recent_state_changes(project, days=days, limit=limit)