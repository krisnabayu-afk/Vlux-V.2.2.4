from fastapi import APIRouter, Depends, UploadFile, File
from typing import Optional

from utils import get_current_user, require_can_edit
from models import SiteCreate, SiteUpdate, PaginatedSiteResponse
from services import site_service

router = APIRouter()

@router.post("/sites")
async def create_site(site_data: SiteCreate, current_user: dict = Depends(require_can_edit("sites"))):
    return await site_service.create_site(site_data, current_user)

@router.get("/sites", response_model=PaginatedSiteResponse)
async def get_sites(
    page: int = 1, 
    limit: int = 15,
    search: Optional[str] = None,
    region: Optional[str] = None,
    fiberzone: Optional[bool] = None,
    current_user: dict = Depends(get_current_user)
):
    return await site_service.get_sites(page, limit, search, region, fiberzone)

@router.get("/sites/{site_id}")
async def get_site(site_id: str, current_user: dict = Depends(get_current_user)):
    return await site_service.get_site(site_id)

@router.put("/sites/{site_id}")
async def update_site(site_id: str, site_data: SiteUpdate, current_user: dict = Depends(require_can_edit("sites"))):
    return await site_service.update_site(site_id, site_data)

@router.delete("/sites/{site_id}")
async def delete_site(site_id: str, current_user: dict = Depends(require_can_edit("sites"))):
    return await site_service.delete_site(site_id, current_user)

@router.get("/sites/export/template")
async def download_site_template(current_user: dict = Depends(get_current_user)):
    return await site_service.download_site_template(current_user)

@router.post("/sites/upload")
async def upload_sites_csv(file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    return await site_service.upload_sites_csv(file, current_user)
