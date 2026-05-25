from fastapi import APIRouter, Depends
from utils import get_current_user
from services import notification_service

router = APIRouter()

@router.get("/notifications")
async def get_notifications(current_user: dict = Depends(get_current_user)):
    return await notification_service.get_notifications(current_user)

@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    return await notification_service.mark_notification_read(notification_id, current_user)

@router.post("/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    return await notification_service.mark_all_notifications_read(current_user)

@router.get("/notifications/unread-count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    return await notification_service.get_unread_count(current_user)
