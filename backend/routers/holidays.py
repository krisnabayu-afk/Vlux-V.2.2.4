from fastapi import APIRouter, Depends
from models import HolidayCreate
from utils import get_current_user
from services import holiday_service

router = APIRouter()

@router.get("/holidays")
async def get_holidays():
    return await holiday_service.get_holidays()

@router.post("/holidays")
async def create_holiday(holiday_data: HolidayCreate, current_user: dict = Depends(get_current_user)):
    return await holiday_service.create_holiday(holiday_data, current_user)

@router.put("/holidays/{holiday_id}")
async def update_holiday(holiday_id: str, holiday_data: HolidayCreate, current_user: dict = Depends(get_current_user)):
    return await holiday_service.update_holiday(holiday_id, holiday_data, current_user)

@router.delete("/holidays/{holiday_id}")
async def delete_holiday(holiday_id: str, current_user: dict = Depends(get_current_user)):
    return await holiday_service.delete_holiday(holiday_id, current_user)
