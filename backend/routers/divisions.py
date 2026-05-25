from fastapi import APIRouter, Depends
from typing import List, Optional

from utils import get_current_user
from models import Division, DivisionCreate, DivisionUpdate
from services import division_service

router = APIRouter()

@router.get("/divisions", response_model=List[Division])
async def list_divisions(
    status_filter: Optional[str] = None,
    department_id: Optional[str] = None,
):
    return await division_service.list_divisions(status_filter, department_id)

@router.get("/divisions/{division_id}", response_model=Division)
async def get_division(division_id: str):
    return await division_service.fetch_division_by_id(division_id)

@router.post("/divisions", response_model=Division)
async def create_division(
    div_data: DivisionCreate,
    current_user: dict = Depends(get_current_user),
):
    return await division_service.create_division(div_data, current_user)

@router.put("/divisions/{division_id}", response_model=Division)
async def update_division(
    division_id: str,
    div_data: DivisionUpdate,
    current_user: dict = Depends(get_current_user),
):
    return await division_service.update_division(division_id, div_data, current_user)

@router.delete("/divisions/{division_id}")
async def delete_division(
    division_id: str,
    current_user: dict = Depends(get_current_user),
):
    return await division_service.delete_division(division_id, current_user)

@router.get("/departments/{department_id}/divisions", response_model=List[Division])
async def get_department_divisions(department_id: str):
    return await division_service.fetch_department_divisions(department_id)

@router.get("/divisions/{division_id}/hierarchy")
async def get_division_hierarchy(division_id: str):
    return await division_service.fetch_division_hierarchy(division_id)

@router.get("/divisions/resolve/{division_name}")
async def resolve_division_name(division_name: str):
    return await division_service.resolve_division_name(division_name)

@router.get("/divisions/concatenated/{concat_label}")
async def get_concatenated_divisions(concat_label: str):
    return await division_service.fetch_concatenated_divisions(concat_label)
