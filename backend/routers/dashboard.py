from fastapi import APIRouter, Depends
from utils import get_current_user
from services import dashboard_service

router = APIRouter()

@router.get("/dashboard")
async def get_dashboard(current_user: dict = Depends(get_current_user)):
    return await dashboard_service.get_dashboard(current_user)
