from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Response, Query
from typing import Optional

from utils import get_current_user, require_can_edit
from models import ActivityCreate, AutoPushUpdateQuery
from services import activity_service

router = APIRouter()

# ============ ACTIVITY ENDPOINTS (NEW) ============


@router.get("/activities/today")
async def get_todays_schedules(current_user: dict = Depends(get_current_user)):
    """Get today's schedules for the logged-in user (primarily for Staff)"""
    return await activity_service.fetch_todays_schedules(current_user)


@router.post("/activities")
async def create_activity(activity_data: ActivityCreate, current_user: dict = Depends(require_can_edit("activity"))):
    """Record an activity action for a schedule"""
    return await activity_service.record_activity(activity_data, current_user)


@router.get("/activities")
async def get_activities(current_user: dict = Depends(get_current_user)):
    """Get activity history - Staff see only their own, Managers/VP see division/all"""
    return await activity_service.fetch_activities(current_user)


@router.post("/activities/progress-update")
async def add_progress_update(
    activity_id: str = Form(...),
    update_text: str = Form(...),
    latitude: Optional[float] = Form(None),
    longitude: Optional[float] = Form(None),
    file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(require_can_edit("activity"))
):
    """Add a timestamped progress update to an activity"""
    return await activity_service.append_progress_update(
        activity_id, update_text, latitude, longitude, file, current_user
    )


@router.post("/activities/auto-push-update")
async def add_auto_progress_update(
    data: AutoPushUpdateQuery,
    current_user: dict = Depends(require_can_edit("activity"))
):
    """Add an automated periodic progress update with location"""
    return await activity_service.append_auto_progress_update(data, current_user)


@router.get("/activities/schedule/{schedule_id}")
async def get_schedule_activity(schedule_id: str, current_user: dict = Depends(get_current_user)):
    # Public endpoint for authenticated users to see activity details
    return await activity_service.fetch_schedule_activity(schedule_id)


# ============ EXPORT USER ACTIVITIES CSV ENDPOINT ============
@router.get("/activities/export-csv")
async def export_activities_csv(
    user_id: str = Query(...),
    month: str = Query(...), # Format: YYYY-MM
    current_user: dict = Depends(get_current_user)
):
    """
    Export CSV containing all progress updates of a selected user and month.
    Authorized for Manager, VP, and SuperUser roles only.
    Managers are restricted to their division hierarchy.
    """
    return await activity_service.generate_activities_csv(user_id, month, current_user)
