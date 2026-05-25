import os
import shutil
import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import HTTPException, UploadFile

from database import db, UPLOAD_DIR
from models import TTB, Documentation

# ============ TTB BUSINESS LOGIC ============

async def upload_ttb(
    site_id: str,
    title: str,
    file: UploadFile,
    current_user: dict
):
    site = await db.sites.find_one({"id": site_id}, {"_id": 0})
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    site_name = site["name"]
    folder_name = "".join(c for c in site_name if c.isalnum() or c in (' ', '-', '_')).strip().replace(' ', '_')

    ttb_dir = UPLOAD_DIR / "reports" / folder_name / "TTB"
    ttb_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"ttb_{timestamp}_{uuid.uuid4().hex[:8]}{file_extension}"
    file_path = ttb_dir / unique_filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_url = f"/uploads/reports/{folder_name}/TTB/{unique_filename}"

    ttb = TTB(
        site_id=site_id,
        site_name=site_name,
        title=title,
        file_path=str(file_path),
        file_url=file_url,
        file_name=file.filename,
        uploaded_by=current_user["id"],
        uploaded_by_name=current_user["username"]
    )

    doc = ttb.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.ttb.insert_one(doc)

    return {"message": "TTB document uploaded successfully", "id": ttb.id}

async def get_ttb_documents(
    page: int,
    limit: int,
    site_id: Optional[str],
    search: Optional[str],
    mine: bool,
    current_user: dict
):
    query = {}

    if mine:
        query["uploaded_by"] = current_user["id"]

    if site_id:
        query["site_id"] = site_id

    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"site_name": {"$regex": search, "$options": "i"}},
            {"uploaded_by_name": {"$regex": search, "$options": "i"}}
        ]

    total = await db.ttb.count_documents(query)
    skip = (page - 1) * limit
    total_pages = (total + limit - 1) // limit if limit > 0 else 0

    items = await db.ttb.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }

async def get_ttb_by_site(site_id: str):
    items = await db.ttb.find({"site_id": site_id}, {"_id": 0}).sort("created_at", -1).to_list(None)
    return items

async def delete_ttb(ttb_id: str, current_user: dict):
    ttb = await db.ttb.find_one({"id": ttb_id}, {"_id": 0})
    if not ttb:
        raise HTTPException(status_code=404, detail="TTB document not found")

    if current_user["id"] != ttb["uploaded_by"] and current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only the uploader or SuperUser can delete this document")

    try:
        if os.path.exists(ttb["file_path"]):
            os.remove(ttb["file_path"])
    except Exception:
        pass

    await db.ttb.delete_one({"id": ttb_id})
    return {"message": "TTB document deleted successfully"}


# ============ DOCUMENTATION BUSINESS LOGIC ============

async def upload_documentation(
    site_id: str,
    title: str,
    file: UploadFile,
    current_user: dict
):
    site = await db.sites.find_one({"id": site_id}, {"_id": 0})
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")

    site_name = site["name"]
    folder_name = "".join(c for c in site_name if c.isalnum() or c in (' ', '-', '_')).strip().replace(' ', '_')

    doc_dir = UPLOAD_DIR / "reports" / folder_name / "documentation"
    doc_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"doc_{timestamp}_{uuid.uuid4().hex[:8]}{file_extension}"
    file_path = doc_dir / unique_filename

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    file_url = f"/uploads/reports/{folder_name}/documentation/{unique_filename}"

    doc = Documentation(
        site_id=site_id,
        site_name=site_name,
        title=title,
        file_path=str(file_path),
        file_url=file_url,
        file_name=file.filename,
        uploaded_by=current_user["id"],
        uploaded_by_name=current_user["username"]
    )

    doc_data = doc.model_dump()
    doc_data["created_at"] = doc_data["created_at"].isoformat()
    await db.documentation.insert_one(doc_data)

    return {"message": "Documentation uploaded successfully", "id": doc.id}

async def get_documentations(
    page: int,
    limit: int,
    site_id: Optional[str],
    search: Optional[str],
    mine: bool,
    current_user: dict
):
    query = {}

    if mine:
        query["uploaded_by"] = current_user["id"]

    if site_id:
        query["site_id"] = site_id

    if search:
        query["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"site_name": {"$regex": search, "$options": "i"}},
            {"uploaded_by_name": {"$regex": search, "$options": "i"}}
        ]

    total = await db.documentation.count_documents(query)
    skip = (page - 1) * limit
    total_pages = (total + limit - 1) // limit if limit > 0 else 0

    items = await db.documentation.find(query, {"_id": 0}).sort("created_at", -1).skip(skip).limit(limit).to_list(limit)

    return {
        "items": items,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }

async def get_documentation_by_site(site_id: str):
    items = await db.documentation.find({"site_id": site_id}, {"_id": 0}).sort("created_at", -1).to_list(None)
    return items

async def delete_documentation(doc_id: str, current_user: dict):
    doc = await db.documentation.find_one({"id": doc_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Documentation not found")

    if current_user["id"] != doc["uploaded_by"] and current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only the uploader or SuperUser can delete this document")

    try:
        if os.path.exists(doc["file_path"]):
            os.remove(doc["file_path"])
    except Exception:
        pass

    await db.documentation.delete_one({"id": doc_id})
    return {"message": "Documentation deleted successfully"}
