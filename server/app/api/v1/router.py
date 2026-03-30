"""V1 API Router — aggregates all sub-routers."""

from fastapi import APIRouter

from app.api.v1.users import router as users_router
from app.api.v1.nodes import router as nodes_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.billing import router as billing_router
from app.api.v1.websocket import router as ws_router

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(users_router)
api_router.include_router(nodes_router)
api_router.include_router(jobs_router)
api_router.include_router(billing_router)
api_router.include_router(ws_router)
