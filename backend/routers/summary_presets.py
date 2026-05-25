from fastapi import APIRouter, Depends
from utils import get_current_user, get_current_admin
from models import SummaryPresetCreate
from services import preset_service

router = APIRouter()

@router.get("/summary-presets")
async def list_summary_presets(current_user: dict = Depends(get_current_user)):
    return await preset_service.list_summary_presets()

@router.post("/summary-presets")
async def create_summary_preset(
    data: SummaryPresetCreate,
    current_user: dict = Depends(get_current_admin),
):
    return await preset_service.create_summary_preset(data)

@router.put("/summary-presets/{preset_id}")
async def update_summary_preset(
    preset_id: str,
    data: SummaryPresetCreate,
    current_user: dict = Depends(get_current_admin),
):
    return await preset_service.update_summary_preset(preset_id, data)

@router.delete("/summary-presets/{preset_id}")
async def delete_summary_preset(
    preset_id: str,
    current_user: dict = Depends(get_current_admin),
):
    return await preset_service.delete_summary_preset(preset_id)

@router.post("/summary-presets/seed")
async def seed_summary_presets(current_user: dict = Depends(get_current_admin)):
    return await preset_service.seed_summary_presets()
