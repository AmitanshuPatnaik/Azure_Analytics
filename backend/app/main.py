from contextlib import asynccontextmanager
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

from app.routes.boards_routes import router as boards_router
from app.routes.pipelines_routes import router as pipelines_router
from app.routes.projects_routes import router as projects_router
from app.routes.repositories_routes import router as repositories_router
from app.routes.testplans_routes import router as testplans_router
from app.routes.auth_routes import router as auth_router
from app.routes.azure_routes import router as azure_router
from app.routes.status_routes import router as status_router

from app.core.sync_worker import SyncWorker

logger = logging.getLogger(__name__)
_sync_worker: SyncWorker | None = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _sync_worker
    logger.info("[Lifespan] Booting Azure background synchronization worker engine...")
    _sync_worker = SyncWorker()
    _sync_worker.start()
    logger.info("[Lifespan] Background worker spawned successfully.")

    yield

    logger.info("[Lifespan] Shutdown intercepted — stopping daemon sync execution loops...")
    if _sync_worker is not None:
        _sync_worker.stop()
    logger.info("[Lifespan] Background daemon reaped safely.")


app = FastAPI(
    title="Azure Analytics API",
    description="FastAPI backend with decoupled background data sync cache.",
    version="2.0.0",
    lifespan=lifespan,
)

# Explicit allowed origins to support secure browser credential passing
allowed_origins = [
    "http://localhost:4200",
    "http://127.0.0.1:4200",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
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

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)