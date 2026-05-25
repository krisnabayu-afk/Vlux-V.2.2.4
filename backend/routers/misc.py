from fastapi import APIRouter, Depends, UploadFile, File, Form
from typing import Optional, List

from utils import get_current_user
from models import (
    VersionUpdate, VersionUpdateCreate, FeedbackCreate, 
    FeedbackStatusUpdate, FeedbackCommentCreate, UserResponse
)
from services import misc_service

router = APIRouter()

@router.post("/morning-briefing")
async def upload_morning_briefing(
    file: UploadFile = File(...),
    date: str = Form(...),
    current_user: dict = Depends(get_current_user)
):
    return await misc_service.upload_morning_briefing(file, date, current_user)

@router.get("/morning-briefing/{date}")
async def get_morning_briefing(date: str, current_user: dict = Depends(get_current_user)):
    return await misc_service.get_morning_briefing(date)

@router.get("/version-updates", response_model=List[VersionUpdate])
async def get_version_updates(current_user: dict = Depends(get_current_user)):
    return await misc_service.get_version_updates()

@router.post("/version-updates", response_model=VersionUpdate)
async def create_version_update(update_data: VersionUpdateCreate, current_user: dict = Depends(get_current_user)):
    return await misc_service.create_version_update(update_data, current_user)

@router.put("/version-updates/{update_id}", response_model=VersionUpdate)
async def update_version_update(update_id: str, update_data: VersionUpdateCreate, current_user: dict = Depends(get_current_user)):
    return await misc_service.update_version_update(update_id, update_data, current_user)

@router.delete("/version-updates/{update_id}")
async def delete_version_update(update_id: str, current_user: dict = Depends(get_current_user)):
    return await misc_service.delete_version_update(update_id, current_user)

@router.get("/feedbacks")
async def get_feedbacks(current_user: dict = Depends(get_current_user)):
    return await misc_service.get_feedbacks()

@router.post("/feedbacks")
async def create_feedback(feedback_data: FeedbackCreate, current_user: dict = Depends(get_current_user)):
    return await misc_service.create_feedback(feedback_data, current_user)

@router.put("/feedbacks/{feedback_id}/status")
async def update_feedback_status(feedback_id: str, status_data: FeedbackStatusUpdate, current_user: dict = Depends(get_current_user)):
    return await misc_service.update_feedback_status(feedback_id, status_data, current_user)

@router.delete("/feedbacks/{feedback_id}")
async def delete_feedback(feedback_id: str, current_user: dict = Depends(get_current_user)):
    return await misc_service.delete_feedback(feedback_id, current_user)

@router.get("/feedbacks/{feedback_id}/comments")
async def get_feedback_comments(feedback_id: str, current_user: dict = Depends(get_current_user)):
    return await misc_service.get_feedback_comments(feedback_id)

@router.post("/feedbacks/{feedback_id}/comments")
async def create_feedback_comment(feedback_id: str, comment_data: FeedbackCommentCreate, current_user: dict = Depends(get_current_user)):
    return await misc_service.create_feedback_comment(feedback_id, comment_data, current_user)

@router.delete("/feedbacks/{feedback_id}/comments/{comment_id}")
async def delete_feedback_comment(feedback_id: str, comment_id: str, current_user: dict = Depends(get_current_user)):
    return await misc_service.delete_feedback_comment(feedback_id, comment_id, current_user)

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user_by_id(user_id: str, current_user: dict = Depends(get_current_user)):
    return await misc_service.get_user_by_id(user_id)

@router.get("/certifications/{user_id}")
async def get_certifications(user_id: str, current_user: dict = Depends(get_current_user)):
    return await misc_service.get_certifications(user_id, current_user)

@router.post("/certifications")
async def add_certification(
    title: str = Form(...),
    date_taken: str = Form(...),
    description: Optional[str] = Form(None),
    pdf_file: Optional[UploadFile] = File(None),
    current_user: dict = Depends(get_current_user)
):
    return await misc_service.add_certification(title, date_taken, description, pdf_file, current_user)

@router.delete("/certifications/{cert_id}")
async def delete_certification(cert_id: str, current_user: dict = Depends(get_current_user)):
    return await misc_service.delete_certification(cert_id, current_user)
