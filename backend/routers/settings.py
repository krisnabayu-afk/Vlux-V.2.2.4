from fastapi import APIRouter, Depends
from models import Settings, SettingsUpdate
from utils import get_current_user
from services import setting_service

router = APIRouter()

@router.get("/settings", response_model=Settings)
async def get_settings(current_user: dict = Depends(get_current_user)):
    return await setting_service.get_settings(current_user)

@router.patch("/settings", response_model=Settings)
async def update_settings(settings_data: SettingsUpdate, current_user: dict = Depends(get_current_user)):
    return await setting_service.update_settings(settings_data, current_user)
