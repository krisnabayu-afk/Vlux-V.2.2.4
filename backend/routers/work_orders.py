from fastapi import APIRouter, Depends, Query
from typing import Optional

from utils import get_current_user, require_can_edit
from models import WorkOrderCreate, WorkOrderUpdate, PaginatedWorkOrderResponse, WorkOrderComment
from services import work_order_service

router = APIRouter()

@router.post("/work-orders")
async def create_work_order(wo_data: WorkOrderCreate, current_user: dict = Depends(require_can_edit("fiberzone"))):
    return await work_order_service.create_work_order(wo_data, current_user)

@router.get("/work-orders", response_model=PaginatedWorkOrderResponse)
async def get_work_orders(
    page: int = 1,
    limit: int = 15,
    status: Optional[str] = Query(None),
    site_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    return await work_order_service.fetch_work_orders(page, limit, status, site_id, search)

@router.get("/work-orders/{wo_id}")
async def get_work_order(wo_id: str, current_user: dict = Depends(get_current_user)):
    return await work_order_service.fetch_work_order_by_id(wo_id)

@router.put("/work-orders/{wo_id}")
async def update_work_order(wo_id: str, update_data: WorkOrderUpdate, current_user: dict = Depends(require_can_edit("fiberzone"))):
    return await work_order_service.update_work_order(wo_id, update_data)

@router.delete("/work-orders/{wo_id}")
async def delete_work_order(wo_id: str, current_user: dict = Depends(require_can_edit("fiberzone"))):
    return await work_order_service.delete_work_order(wo_id)

@router.post("/work-orders/{wo_id}/comments")
async def add_work_order_comment(wo_id: str, comment_data: WorkOrderComment, current_user: dict = Depends(require_can_edit("fiberzone"))):
    return await work_order_service.add_work_order_comment(wo_id, comment_data, current_user)