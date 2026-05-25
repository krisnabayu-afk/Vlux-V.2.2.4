from fastapi import APIRouter, Depends, Query
from typing import Optional

from utils import get_current_user, require_can_edit
from models import TicketCreate, TicketUpdate, PaginatedTicketResponse, TicketComment
from services import ticket_service

router = APIRouter()

@router.post("/tickets")
async def create_ticket(ticket_data: TicketCreate, current_user: dict = Depends(require_can_edit("tickets"))):
    return await ticket_service.create_ticket(ticket_data, current_user)

@router.get("/tickets", response_model=PaginatedTicketResponse)
async def get_tickets(
    page: int = 1,
    limit: int = 15,
    site_id: Optional[str] = None,
    region: Optional[str] = None,
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    assigned_to_division: Optional[str] = Query(None),
    exclude_closed: Optional[bool] = Query(None),
    search: Optional[str] = None,
    sort: str = "newest",
    current_user: dict = Depends(get_current_user)
):
    return await ticket_service.fetch_tickets(
        page, limit, site_id, region, category, status, assigned_to_division, exclude_closed, search, sort
    )

@router.get("/tickets/export/csv")
async def export_tickets_csv(
    export_month: Optional[str] = Query(None),
    site_id: Optional[str] = None,
    region: Optional[str] = None,
    category: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    assigned_to_division: Optional[str] = Query(None),
    exclude_closed: Optional[bool] = Query(None),
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    return await ticket_service.generate_tickets_csv(
        export_month, site_id, region, category, status, assigned_to_division, exclude_closed, search
    )

@router.get("/tickets/list/all")
async def get_all_tickets_list(current_user: dict = Depends(get_current_user)):
    return await ticket_service.fetch_all_tickets_list()

@router.get("/tickets/{ticket_id}")
async def get_ticket(ticket_id: str, current_user: dict = Depends(get_current_user)):
    return await ticket_service.fetch_ticket_by_id(ticket_id)

@router.patch("/tickets/{ticket_id}")
async def update_ticket(ticket_id: str, update_data: TicketUpdate, current_user: dict = Depends(require_can_edit("tickets"))):
    return await ticket_service.update_ticket(ticket_id, update_data)

@router.put("/tickets/{ticket_id}")
async def edit_ticket(ticket_id: str, edit_data: TicketUpdate, current_user: dict = Depends(require_can_edit("tickets"))):
    return await ticket_service.edit_ticket(ticket_id, edit_data)

@router.post("/tickets/{ticket_id}/close")
async def close_ticket(ticket_id: str, current_user: dict = Depends(require_can_edit("tickets"))):
    return await ticket_service.close_ticket(ticket_id)

@router.post("/tickets/{ticket_id}/reopen")
async def reopen_ticket(ticket_id: str, current_user: dict = Depends(require_can_edit("tickets"))):
    return await ticket_service.reopen_ticket(ticket_id)

@router.post("/tickets/{ticket_id}/comments")
async def add_ticket_comment(ticket_id: str, comment_data: TicketComment, current_user: dict = Depends(require_can_edit("tickets"))):
    return await ticket_service.add_ticket_comment(ticket_id, comment_data, current_user)

@router.post("/tickets/{ticket_id}/link-report/{report_id}")
async def link_report_to_ticket(ticket_id: str, report_id: str, current_user: dict = Depends(require_can_edit("tickets"))):
    return await ticket_service.link_report_to_ticket(ticket_id, report_id)

@router.delete("/tickets/{ticket_id}")
async def delete_ticket(ticket_id: str, current_user: dict = Depends(require_can_edit("tickets"))):
    return await ticket_service.delete_ticket(ticket_id, current_user)
