from contextlib import asynccontextmanager

from fastapi.responses import PlainTextResponse
from models.handle_logging import get_logging_conf
logging = get_logging_conf()
import os

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from typing import Optional
from pydantic import BaseModel

from services.reviewer.webhooks_service import fetch_webhooks
from services.reviewer.repos_service import fetch_repos
from services.reviewer.project_service import fetch_projects
from services.reviewer.PR_service import AzurePRManager

from routes.boards_routes import router as boards_router
from routes.pipelines_routes import router as pipelines_router
from routes.projects_routes import router as projects_router
from routes.repositories_routes import router as repositories_router
from routes.testplans_routes import router as testplans_router
from routes.auth_routes import router as auth_router
from routes.azure_routes import router as azure_router
from routes.status_routes import router as status_router

from core.sync_worker import SyncWorker

logger = logging.getLogger(__name__)
_sync_worker: SyncWorker | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _sync_worker
    logger.info("[Lifespan] Application startup")
    logger.info("[Lifespan] Booting Azure background synchronization worker engine...")
    _sync_worker = SyncWorker()
    _sync_worker.start()
    logger.info("[Lifespan] Background worker spawned successfully (daemon=True).")
    logger.info("[Lifespan] Azure Analytics API is ready to accept requests.")

    yield

    logger.info("[Lifespan] Application shutdown")
    logger.info("[Lifespan] Shutdown intercepted — stopping daemon sync execution loops...")
    if _sync_worker is not None:
        _sync_worker.stop()
        logger.info("[Lifespan] Stop event signalled to SyncWorker daemon.")
    logger.info("[Lifespan] Background daemon reaped safely. Goodbye.")


app = FastAPI(
    title="Azure Analytics API",
    description="FastAPI backend with decoupled background data sync cache.",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects_router, prefix="/api")
app.include_router(repositories_router, prefix="/api")
app.include_router(pipelines_router, prefix="/api")
app.include_router(boards_router, prefix="/api")
app.include_router(testplans_router, prefix="/api")
app.include_router(auth_router)
app.include_router(azure_router, prefix="/api")
app.include_router(status_router, prefix="/api")

manager = AzurePRManager()

class ReviewRequest(BaseModel):
    repo_id: str
    pr_id: int
    review: str
    project: Optional[str] = None

logger.info("[Main] Registered routers: projects, repositories, pipelines, boards, testplans, auth, azure, status")


@app.get("/")
async def default():
    logger.debug("[Main] Root health-check endpoint hit.")
    return "Watcher API is running ..."


@app.get('/api/watcher/ghty34jkdzxdo0o/log', response_class=PlainTextResponse)
async def log(lines: int = Query(default=100, description="Number of log lines to retrieve")):
    try:
        log=""
        if lines is not None:
            lines = min(int(lines), 100000)
        with open("logs/app.log", "r") as f:
            log = f.readlines()
            if len(log)>lines:
                log = log[len(log)-lines:]
        log = "".join(log)
        return log
    except Exception as e:
        logging.error(str(e))
        return ""
    
@app.get("/api/webhooks")
async def get_webhooks():
    return fetch_webhooks()


@app.get("/api/projects")
async def get_projects():
    return fetch_projects()


@app.get("/api/repos")
async def get_repos():
    return fetch_repos()


@app.get("/api/pr")
async def get_prs(repo: Optional[str] = Query(None), project: Optional[str] = Query(None)):
    if project:
        manager.project = project
    return manager.fetch_prs(repo_target=repo)


@app.get("/api/pr_iterations")
async def get_pr_iterations(repo_id: Optional[str] = Query(None), pr_id: Optional[int] = Query(None), project: Optional[str] = Query(None)):
    if repo_id and pr_id:
        manager.repo_id = repo_id
        manager.pr_id = pr_id
    if project:
        manager.project = project
    return manager.fetch_latest_iteration()


@app.get("/api/pr_changes")
async def get_pr_changes(repo_id: Optional[str] = Query(None), pr_id: Optional[int] = Query(None),iteration_id: Optional[int] = Query(None), project: Optional[str] = Query(None)):
    if repo_id and pr_id and iteration_id:
        manager.repo_id = repo_id
        manager.pr_id = pr_id
        manager.iteration_id = iteration_id
    if project:
        manager.project = project
    return manager.get_changed_files()


@app.get("/api/pr_deltas")
async def get_pr_deltas(repo_id: Optional[str] = Query(None),pr_id: Optional[int] = Query(None),iteration_id: Optional[int] = Query(None), project: Optional[str] = Query(None)):
    if repo_id:
        manager.repo_id = repo_id

    if pr_id:
        manager.pr_id = pr_id

    if iteration_id:
        manager.iteration_id = iteration_id

    if project:
        manager.project = project

    return manager.get_file_deltas()


@app.get("/api/pr_review")
async def review_pr(repo_id: Optional[str] = Query(None),pr_id: Optional[int] = Query(None),iteration_id: Optional[int] = Query(None), project: Optional[str] = Query(None)):
    if repo_id:
        manager.repo_id = repo_id

    if pr_id:
        manager.pr_id = pr_id

    if iteration_id:
        manager.iteration_id = iteration_id

    if project:
        manager.project = project

    return manager.review_current_pr()


@app.post("/api/post_review")
async def post_review(request: ReviewRequest):
    manager.repo_id = request.repo_id
    manager.pr_id = request.pr_id
    if request.project:
        manager.project = request.project

    return manager.post_review(request.review)

if __name__ == "__main__":
    port = int(os.environ.get("SERVER_PORT", 80))
    logger.info("[Main] Starting uvicorn on 0.0.0.0:%d", port)
    uvicorn.run("main:app",host="0.0.0.0",port=port,reload=False)