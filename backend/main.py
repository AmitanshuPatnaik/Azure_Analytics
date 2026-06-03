from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from Azure_Devops.projects import fetch_projects
from Azure_Devops.repositories import fetch_repositories, fetch_all_repositories

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/projects")
async def get_projects():
    result = fetch_projects()
    
    if not result["success"]:
        raise HTTPException(
            status_code=result["status_code"],
            detail=result["error"]
        )
    
    return result

@app.get("/api/projects/{project_name}/repos")
async def get_repositories(project_name):
    result = fetch_repositories(project_name)

    if not result["success"]:
        raise HTTPException(
            status_code=result["status_code"],
            detail=result["error"]
        )
    
    return result

@app.get("/api/repos")
async def get_all_repositories():
    result = fetch_all_repositories()

    if not result["success"]:
        raise HTTPException(
            status_code=result["status_code"],
            detail=result["error"]
        )
    
    return result