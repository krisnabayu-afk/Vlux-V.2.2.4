from fastapi import APIRouter, Depends, UploadFile, File, Form, Query
from typing import Optional

from utils import get_current_user
from models import PaginatedDocumentationResponse
from services import document_service

router = APIRouter()

@router.post("/documentation")
async def upload_documentation(
    site_id: str = Form(...),
    title: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    return await document_service.upload_documentation(site_id, title, file, current_user)

@router.get("/documentation", response_model=PaginatedDocumentationResponse)
async def get_documentations(
    page: int = 1,
    limit: int = 15,
    site_id: Optional[str] = None,
    search: Optional[str] = None,
    mine: bool = Query(False),
    current_user: dict = Depends(get_current_user)
):
    return await document_service.get_documentations(page, limit, site_id, search, mine, current_user)

@router.get("/documentation/site/{site_id}")
async def get_documentation_by_site(
    site_id: str,
    current_user: dict = Depends(get_current_user)
):
    return await document_service.get_documentation_by_site(site_id)

@router.delete("/documentation/{doc_id}")
async def delete_documentation(
    doc_id: str,
    current_user: dict = Depends(get_current_user)
):
    return await document_service.delete_documentation(doc_id, current_user)
