from fastapi import APIRouter, Depends
from models import StarlinkCreate, StarlinkUpdate
from utils import get_current_user
from services import starlink_service

router = APIRouter()

@router.get("/starlinks")
async def get_starlinks(current_user: dict = Depends(get_current_user)):
    return await starlink_service.get_starlinks()

@router.post("/starlinks")
async def create_starlink(starlink_data: StarlinkCreate, current_user: dict = Depends(get_current_user)):
    return await starlink_service.create_starlink(starlink_data, current_user)

@router.put("/starlinks/{id}")
async def update_starlink(id: str, starlink_data: StarlinkUpdate, current_user: dict = Depends(get_current_user)):
    return await starlink_service.update_starlink(id, starlink_data, current_user)

@router.delete("/starlinks/{id}")
async def delete_starlink(id: str, current_user: dict = Depends(get_current_user)):
    return await starlink_service.delete_starlink(id, current_user)

@router.post("/starlinks/{id}/renew")
async def renew_starlink(id: str, current_user: dict = Depends(get_current_user)):
    return await starlink_service.renew_starlink(id, current_user)
