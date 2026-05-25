from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from typing import Optional

from utils import get_current_user, require_can_edit
from models import PaginatedTTBResponse
from services import document_service

router = APIRouter()

@router.post("/ttb")
async def upload_ttb(
    site_id: str = Form(...),
    title: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(require_can_edit("ttb"))
):
    return await document_service.upload_ttb(site_id, title, file, current_user)

@router.get("/ttb", response_model=PaginatedTTBResponse)
async def get_ttb_documents(
    page: int = 1,
    limit: int = 15,
    site_id: Optional[str] = None,
    search: Optional[str] = None,
    mine: bool = Query(False),
    current_user: dict = Depends(get_current_user)
):
    return await document_service.get_ttb_documents(page, limit, site_id, search, mine, current_user)

@router.get("/ttb/site/{site_id}")
async def get_ttb_by_site(
    site_id: str,
    current_user: dict = Depends(get_current_user)
):
    return await document_service.get_ttb_by_site(site_id)

@router.delete("/ttb/{ttb_id}")
async def delete_ttb(
    ttb_id: str,
    current_user: dict = Depends(require_can_edit("ttb"))
):
    return await document_service.delete_ttb(ttb_id, current_user)
