from fastapi import APIRouter, Depends
from models import DepartmentPermissionUpsert
from utils import get_current_user
from services import permission_service

router = APIRouter()

@router.get("/permissions")
async def list_all_permissions(current_user: dict = Depends(get_current_user)):
    return await permission_service.list_all_permissions(current_user)

@router.get("/permissions/department/{dept_id}")
async def get_department_permissions(dept_id: str, current_user: dict = Depends(get_current_user)):
    return await permission_service.get_department_permissions(dept_id, current_user)

@router.put("/permissions/department/{dept_id}")
async def upsert_department_permissions(
    dept_id: str,
    payload: DepartmentPermissionUpsert,
    current_user: dict = Depends(get_current_user),
):
    return await permission_service.upsert_department_permissions(dept_id, payload, current_user)

@router.get("/permissions/my")
async def get_my_permissions(current_user: dict = Depends(get_current_user)):
    return await permission_service.get_my_permissions(current_user)
