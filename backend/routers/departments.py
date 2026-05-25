from fastapi import APIRouter, Depends
from typing import List

from utils import get_current_user
from models import Department, DepartmentCreate, DepartmentUpdate
from services import department_service

router = APIRouter()

@router.get("/departments", response_model=List[Department])
async def get_departments():
    return await department_service.fetch_departments()

@router.post("/departments", response_model=Department)
async def create_department(dept_data: DepartmentCreate, current_user: dict = Depends(get_current_user)):
    return await department_service.create_department(dept_data, current_user)

@router.put("/departments/{dept_id}", response_model=dict)
async def update_department(dept_id: str, dept_data: DepartmentUpdate, current_user: dict = Depends(get_current_user)):
    return await department_service.update_department(dept_id, dept_data, current_user)

@router.delete("/departments/{dept_id}")
async def delete_department(dept_id: str, current_user: dict = Depends(get_current_user)):
    return await department_service.delete_department(dept_id, current_user)
