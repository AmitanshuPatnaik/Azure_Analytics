from contextlib import asynccontextmanager

from fastapi.responses import PlainTextResponse
from models.handle_logging import get_logging_conf
logging = get_logging_conf()
import os

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

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

logger.info(
    "[Main] Registered routers: projects, repositories, pipelines, boards, "
    "testplans, auth, azure, status"
)


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

if __name__ == "__main__":
    port = int(os.environ.get("SERVER_PORT", 80))
    logger.info("[Main] Starting uvicorn on 0.0.0.0:%d", port)
    uvicorn.run("main:app",host="0.0.0.0",port=port,reload=False)