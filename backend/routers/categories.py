from fastapi import APIRouter, Depends
from models import CategoryCreate
from utils import get_current_user
from services import category_service

router = APIRouter()

@router.get("/activity-categories")
async def get_activity_categories(current_user: dict = Depends(get_current_user)):
    return await category_service.get_activity_categories()

@router.post("/activity-categories")
async def create_activity_category(category_data: CategoryCreate, current_user: dict = Depends(get_current_user)):
    return await category_service.create_activity_category(category_data, current_user)

@router.delete("/activity-categories/{category_id}")
async def delete_activity_category(category_id: str, current_user: dict = Depends(get_current_user)):
    return await category_service.delete_activity_category(category_id, current_user)
