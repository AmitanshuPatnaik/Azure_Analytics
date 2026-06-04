from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from Azure_Devops.projects import fetch_projects
from Azure_Devops.repositories import fetch_repositories, fetch_all_repositories, fetch_files, fetch_commits, fetch_branches, fetch_pull_requests, fetch_pushes, fetch_tags
from Azure_Devops.pipelines import fetch_pipelines
from Azure_Devops.testplans import fetch_test_plans
from Azure_Devops.boards import fetch_work_items

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

@app.get("/api/projects/{project_name}/repos/{repo_name}/commits")
async def get_commits(project_name):
    result = fetch_commits(project_name)

    if not result["success"]:
        raise HTTPException(
            status_code=result["status_code"],
            detail=result["error"]
        )
    
    return result

@app.get("/api/projects/{project_name}/repos/{repo_name}/branches")
async def get_branches(project_name):
    result = fetch_branches(project_name)

    if not result["success"]:
        raise HTTPException(
            status_code=result["status_code"],
            detail=result["error"]
        )
    
    return result

@app.get("/api/projects/{project_name}/repos/{repo_name}/pushes")
async def get_pushes(project_name):
    result = fetch_pushes(project_name)

    if not result["success"]:
        raise HTTPException(
            status_code=result["status_code"],
            detail=result["error"]
        )
    
    return result

@app.get("/api/projects/{project_name}/repos/{repo_name}/tags")
async def get_tags(project_name):
    result = fetch_tags(project_name)

    if not result["success"]:
        raise HTTPException(
            status_code=result["status_code"],
            detail=result["error"]
        )
    
    return result

@app.get("/api/projects/{project_name}/repos/{repo_name}/pullrequests")
async def get_pull_requests(project_name):
    result = fetch_pull_requests(project_name)

    if not result["success"]:
        raise HTTPException(
            status_code=result["status_code"],
            detail=result["error"]
        )
    
    return result

@app.get("/api/projects/{project_name}/repos/{repo_name}/files")
async def get_files(project_name):
    result = fetch_files(project_name)

    if not result["success"]:
        raise HTTPException(
            status_code=result["status_code"],
            detail=result["error"]
        )
    
    return result

@app.get("/api/projects/{project_name}/pipelines")
async def get_pipelines(project_name):
    result = fetch_pipelines(project_name)

    if not result["success"]:
        raise HTTPException(
            status_code=result["status_code"],
            detail=result["error"]
        )
    
    return result

@app.get("/api/projects/{project_name}/workitems")
async def get_work_items(project_name):
    result = fetch_work_items(project_name)

    if not result["success"]:
        raise HTTPException(
            status_code=result["status_code"],
            detail=result["error"]
        )
    
    return result

@app.get("/api/projects/{project_name}/testplans")
async def get_test_plans(project_name):
    result = fetch_test_plans(project_name)

    if not result["success"]:
        raise HTTPException(
            status_code=result["status_code"],
            detail=result["error"]
        )
    
    return result


if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)