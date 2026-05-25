import os
import shutil
import uuid
import logging
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import HTTPException, UploadFile

from database import db, UPLOAD_DIR
from models import (
    VersionUpdate, VersionUpdateCreate, Feedback, FeedbackCreate, 
    FeedbackStatusUpdate, FeedbackComment, FeedbackCommentCreate, UserResponse,
    UserCertification
)

# ============ MORNING BRIEFING LOGIC ============

async def upload_morning_briefing(file: UploadFile, date: str, current_user: dict):
    if file.content_type != "application/pdf" and not file.filename.lower().endswith(".pdf"):
         raise HTTPException(status_code=400, detail="Only PDF files are allowed")
    
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
    briefing_dir = UPLOAD_DIR / "morning_briefings" / date
    briefing_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = briefing_dir / "briefing.pdf"
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    return {"message": "Morning briefing uploaded successfully", "url": f"/uploads/morning_briefings/{date}/briefing.pdf"}

async def get_morning_briefing(date: str):
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")
        
    file_path = UPLOAD_DIR / "morning_briefings" / date / "briefing.pdf"
    if file_path.exists():
        return {"url": f"/uploads/morning_briefings/{date}/briefing.pdf"}
    else:
        raise HTTPException(status_code=404, detail="No briefing found for this date")


# ============ VERSION UPDATES LOGIC ============

async def get_version_updates():
    updates = await db.version_updates.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return updates

async def create_version_update(update_data: VersionUpdateCreate, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only Super Users can add version updates")
        
    update = VersionUpdate(
        version=update_data.version,
        changes=update_data.changes,
        created_by=current_user["username"]
    )
    doc = update.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.version_updates.insert_one(doc)
    return update

async def update_version_update(update_id: str, update_data: VersionUpdateCreate, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only Super Users can update version updates")
        
    existing_update = await db.version_updates.find_one({"id": update_id}, {"_id": 0})
    if not existing_update:
        raise HTTPException(status_code=404, detail="Version update not found")
        
    update_dict = update_data.model_dump()
    update_dict['updated_at'] = datetime.now(timezone.utc).isoformat()
    await db.version_updates.update_one(
        {"id": update_id},
        {"$set": update_dict}
    )
    updated_doc = await db.version_updates.find_one({"id": update_id}, {"_id": 0})
    return updated_doc

async def delete_version_update(update_id: str, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only Super Users can delete version updates")
        
    result = await db.version_updates.delete_one({"id": update_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Version update not found")
    return {"message": "Version update deleted successfully"}


# ============ FEEDBACK LOGIC ============

async def get_feedbacks():
    feedbacks = await db.feedbacks.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return feedbacks

async def create_feedback(feedback_data: FeedbackCreate, current_user: dict):
    if not feedback_data.title.strip():
        raise HTTPException(status_code=400, detail="Title is required")
    if not feedback_data.description.strip():
        raise HTTPException(status_code=400, detail="Description is required")
        
    feedback = Feedback(
        user_id=current_user["id"],
        user_name=current_user["username"],
        user_role=current_user["role"],
        title=feedback_data.title.strip(),
        description=feedback_data.description.strip(),
    )
    doc = feedback.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.feedbacks.insert_one(doc)
    doc.pop('_id', None)
    return doc

async def update_feedback_status(feedback_id: str, status_data: FeedbackStatusUpdate, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only Super Users can update feedback status")
    if status_data.status not in ["Open", "Closed"]:
        raise HTTPException(status_code=400, detail="Status must be 'Open' or 'Closed'")
        
    result = await db.feedbacks.update_one(
        {"id": feedback_id},
        {"$set": {"status": status_data.status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Feedback not found")
    updated = await db.feedbacks.find_one({"id": feedback_id}, {"_id": 0})
    return updated

async def delete_feedback(feedback_id: str, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only Super Users can delete feedbacks")
        
    result = await db.feedbacks.delete_one({"id": feedback_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Feedback not found")
        
    await db.feedback_comments.delete_many({"feedback_id": feedback_id})
    return {"message": "Feedback deleted successfully"}

async def get_feedback_comments(feedback_id: str):
    comments = await db.feedback_comments.find({"feedback_id": feedback_id}, {"_id": 0}).sort("created_at", 1).to_list(500)
    return comments

async def create_feedback_comment(feedback_id: str, comment_data: FeedbackCommentCreate, current_user: dict):
    feedback = await db.feedbacks.find_one({"id": feedback_id})
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found")
    if not comment_data.content.strip():
        raise HTTPException(status_code=400, detail="Comment content is required")
        
    comment = FeedbackComment(
        feedback_id=feedback_id,
        user_id=current_user["id"],
        user_name=current_user["username"],
        user_role=current_user["role"],
        content=comment_data.content.strip(),
    )
    doc = comment.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.feedback_comments.insert_one(doc)
    doc.pop('_id', None)
    return doc

async def delete_feedback_comment(feedback_id: str, comment_id: str, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only Super Users can delete comments")
        
    result = await db.feedback_comments.delete_one({"id": comment_id, "feedback_id": feedback_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Comment not found")
    return {"message": "Comment deleted successfully"}


# ============ USERS BY ID LOGIC ============

async def get_user_by_id(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return UserResponse(
        id=user["id"],
        username=user["username"],
        email=user["email"],
        role=user["role"],
        department=user.get("department"),
        division=user.get("division"),
        region=user.get("region"),
        account_status=user.get("account_status"),
        profile_photo=user.get("profile_photo"),
        telegram_id=user.get("telegram_id")
    )


# ============ CERTIFICATIONS LOGIC ============

async def get_certifications(user_id: str, current_user: dict):
    if current_user["id"] != user_id and current_user["role"] not in ["Manager", "SPV", "VP", "SuperUser"]:
        raise HTTPException(status_code=403, detail="Not authorized to view these certifications")
        
    certs = await db.certifications.find({"user_id": user_id}, {"_id": 0}).sort("date_taken", -1).to_list(100)
    return certs

async def add_certification(
    title: str,
    date_taken: str,
    description: Optional[str],
    pdf_file: Optional[UploadFile],
    current_user: dict
):
    pdf_path = None
    pdf_name = None
    if pdf_file:
        if not pdf_file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
            
        user_cert_dir = UPLOAD_DIR / "certifications" / f"user_{current_user['id']}"
        user_cert_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        unique_filename = f"cert_{timestamp}_{uuid.uuid4().hex[:8]}.pdf"
        file_path = user_cert_dir / unique_filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(pdf_file.file, buffer)
            
        pdf_path = f"/uploads/certifications/user_{current_user['id']}/{unique_filename}"
        pdf_name = pdf_file.filename
        
    cert = UserCertification(
        user_id=current_user["id"],
        title=title,
        date_taken=date_taken,
        description=description,
        pdf_path=pdf_path,
        pdf_name=pdf_name
    )
    doc = cert.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.certifications.insert_one(doc)
    doc.pop('_id', None)
    return doc

async def delete_certification(cert_id: str, current_user: dict):
    cert = await db.certifications.find_one({"id": cert_id})
    if not cert:
        raise HTTPException(status_code=404, detail="Certification not found")
    if cert["user_id"] != current_user["id"] and current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Not authorized to delete this certification")
        
    if cert.get("pdf_path"):
        filepath = UPLOAD_DIR / cert["pdf_path"].replace("/uploads/", "")
        if filepath.exists():
            try:
                os.remove(filepath)
            except Exception as e:
                logging.error(f"Failed to delete certification file {filepath}: {e}")
                
    await db.certifications.delete_one({"id": cert_id})
    return {"message": "Certification deleted successfully"}
