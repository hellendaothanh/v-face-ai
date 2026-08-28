from fastapi import APIRouter

from app.api.v1.endpoints import auth, org, roles, users

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["Authentication & Tokens"])
api_router.include_router(users.router, prefix="/users", tags=["Users & Profiles"])
api_router.include_router(roles.router, prefix="/rbac", tags=["RBAC Roles & Permissions"])
api_router.include_router(org.router, prefix="/organization", tags=["Organization Structure"])
