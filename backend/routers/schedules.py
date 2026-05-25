from fastapi import APIRouter, Depends, UploadFile, File, Query
from typing import Optional

from utils import get_current_user, require_can_edit
from models import ScheduleCreate, ScheduleUpdate, ShiftChangeRequestCreate, ShiftChangeReviewAction
from services import schedule_service

router = APIRouter()

@router.post("/schedules")
async def create_schedule(schedule_data: ScheduleCreate, current_user: dict = Depends(require_can_edit("scheduler"))):
    return await schedule_service.create_schedule(schedule_data, current_user)

@router.post("/schedules/bulk-upload")
async def bulk_upload_schedules(
    file: UploadFile = File(...),
    current_user: dict = Depends(require_can_edit("scheduler"))
):
    return await schedule_service.bulk_upload_schedules(file, current_user)

@router.get("/schedules")
async def get_schedules(
    region: Optional[str] = None,
    site_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    return await schedule_service.fetch_schedules(region, site_id)

@router.get("/schedules/export")
async def export_schedules(
    month: Optional[int] = Query(None, ge=1, le=12),
    year: Optional[int] = Query(None),
    site_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    return await schedule_service.generate_schedules_csv(month, year, site_id)

@router.delete("/schedules/{schedule_id}")
async def delete_schedule(schedule_id: str, current_user: dict = Depends(require_can_edit("scheduler"))):
    return await schedule_service.delete_schedule(schedule_id, current_user)

@router.put("/schedules/{schedule_id}")
async def update_schedule(schedule_id: str, update_data: ScheduleUpdate, current_user: dict = Depends(require_can_edit("scheduler"))):
    return await schedule_service.update_schedule(schedule_id, update_data, current_user)

@router.post("/schedules/change-request")
async def create_shift_change_request(
    request_data: ShiftChangeRequestCreate,
    current_user: dict = Depends(require_can_edit("scheduler"))
):
    return await schedule_service.create_shift_change_request(request_data, current_user)

@router.get("/schedules/change-requests")
async def get_shift_change_requests(current_user: dict = Depends(get_current_user)):
    return await schedule_service.fetch_shift_change_requests(current_user)

@router.post("/schedules/change-requests/review")
async def review_shift_change_request(
    action_data: ShiftChangeReviewAction,
    current_user: dict = Depends(require_can_edit("scheduler"))
):
    return await schedule_service.review_shift_change_request(action_data, current_user)
