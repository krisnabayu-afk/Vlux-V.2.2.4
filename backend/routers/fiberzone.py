from fastapi import APIRouter, Depends, Query
from typing import Optional

from utils import get_current_user, require_can_edit
from models import FiberzoneScheduleCreate, FiberzoneScheduleUpdate
from services import fiberzone_service

router = APIRouter()

@router.get("/fiberzone/dashboard")
async def get_fiberzone_dashboard(current_user: dict = Depends(get_current_user)):
    return await fiberzone_service.get_fiberzone_dashboard()

@router.post("/fiberzone/schedules")
async def create_fiberzone_schedule(
    data: FiberzoneScheduleCreate,
    current_user: dict = Depends(require_can_edit("fiberzone"))
):
    return await fiberzone_service.create_fiberzone_schedule(data, current_user)

@router.get("/fiberzone/schedules")
async def get_fiberzone_schedules(
    site_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    return await fiberzone_service.get_fiberzone_schedules(site_id)

@router.get("/fiberzone/schedules/today")
async def get_fiberzone_schedules_today(current_user: dict = Depends(get_current_user)):
    return await fiberzone_service.get_fiberzone_schedules_today()

@router.get("/fiberzone/schedules/export")
async def export_fiberzone_schedules(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(...),
    current_user: dict = Depends(get_current_user)
):
    return await fiberzone_service.export_fiberzone_schedules(month, year)

@router.put("/fiberzone/schedules/{schedule_id}")
async def update_fiberzone_schedule(
    schedule_id: str,
    data: FiberzoneScheduleUpdate,
    current_user: dict = Depends(require_can_edit("fiberzone"))
):
    return await fiberzone_service.update_fiberzone_schedule(schedule_id, data, current_user)

@router.delete("/fiberzone/schedules/{schedule_id}")
async def delete_fiberzone_schedule(
    schedule_id: str,
    current_user: dict = Depends(require_can_edit("fiberzone"))
):
    return await fiberzone_service.delete_fiberzone_schedule(schedule_id, current_user)

@router.get("/fiberzone/users")
async def get_fiberzone_users(current_user: dict = Depends(get_current_user)):
    return await fiberzone_service.get_fiberzone_users()

@router.get("/fiberzone/sites-list")
async def get_fiberzone_sites(current_user: dict = Depends(get_current_user)):
    return await fiberzone_service.get_fiberzone_sites()
