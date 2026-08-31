from fastapi import APIRouter

from app.api.v1.endpoints import (
    analytics,
    attendance,
    auth,
    camera,
    devices,
    employees,
    requests,
    websocket,
    shifts,
    payroll,
    reports,
    notifications,
    offices,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Face Login"])
api_router.include_router(employees.router)
api_router.include_router(attendance.router)
api_router.include_router(requests.router)
api_router.include_router(devices.router)
api_router.include_router(offices.router)
api_router.include_router(analytics.router)
api_router.include_router(camera.router)
api_router.include_router(websocket.router)
api_router.include_router(shifts.router)
api_router.include_router(payroll.router)
api_router.include_router(reports.router)
api_router.include_router(notifications.router)

