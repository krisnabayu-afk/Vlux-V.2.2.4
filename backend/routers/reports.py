from fastapi import APIRouter, Depends, Form, UploadFile, File, Query
from typing import Optional

from utils import get_current_user, require_can_edit
from models import PaginatedReportResponse, ApprovalAction, CancelApprovalRequest, CommentCreate
from services import report_service

router = APIRouter()

@router.post("/reports")
async def create_report(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    ticket_id: Optional[str] = Form(None),
    site_id: Optional[str] = Form(None),
    category_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    file_2: Optional[UploadFile] = File(None),
    current_user: dict = Depends(require_can_edit("reports"))
):
    return await report_service.create_report(
        title, description, ticket_id, site_id, category_id, file, file_2, current_user
    )

@router.get("/reports", response_model=PaginatedReportResponse)
async def get_reports(
    page: int = 1,
    limit: int = 15,
    site_id: Optional[str] = None, 
    ticket_id: Optional[str] = None,
    division: Optional[str] = None,
    region: Optional[str] = None,
    search: Optional[str] = None,
    mine: bool = Query(False),
    approving: bool = Query(False),
    sort: str = "newest",
    current_user: dict = Depends(get_current_user),
):
    return await report_service.fetch_reports(
        page, limit, site_id, ticket_id, division, region, search, mine, approving, sort, current_user
    )

@router.get("/reports/export/csv")
async def export_reports_csv(
    site_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    return await report_service.generate_reports_csv(site_id)

@router.get("/reports/{report_id}")
async def get_report(report_id: str, current_user: dict = Depends(get_current_user)):
    return await report_service.fetch_report_by_id(report_id, current_user)

@router.get("/reports/statistics/user-counts")
async def get_user_report_statistics(
    year: int,
    month: Optional[int] = None,
    category_id: Optional[str] = None,
    region: Optional[str] = None,
    view_type: str = "monthly",
    current_user: dict = Depends(get_current_user)
):
    return await report_service.get_user_report_statistics(year, month, category_id, region, view_type)

@router.get("/reports/statistics/site-counts")
async def get_site_report_statistics(
    year: int,
    month: Optional[int] = None,
    category_id: Optional[str] = None,
    region: Optional[str] = None,
    view_type: str = "monthly",
    current_user: dict = Depends(get_current_user)
):
    return await report_service.get_site_report_statistics(year, month, category_id, region, view_type)

@router.get("/reports/statistics/category-counts")
async def get_category_report_statistics(
    year: int,
    month: Optional[int] = None,
    region: Optional[str] = None,
    view_type: str = "monthly",
    current_user: dict = Depends(get_current_user)
):
    return await report_service.get_category_report_statistics(year, month, region, view_type)

@router.get("/reports/statistics/export")
async def export_statistics_csv(
    year: int,
    region: Optional[str] = None,
    category_id: Optional[str] = None,
    dimension: str = "user",
    current_user: dict = Depends(get_current_user)
):
    return await report_service.generate_statistics_csv(year, region, category_id, dimension)

@router.get("/reports/statistics/leaderboard")
async def get_rating_leaderboard(
    year: int,
    month: Optional[int] = None,
    view_type: str = "monthly",
    region: Optional[str] = None,
    department: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    return await report_service.get_rating_leaderboard(year, month, view_type, region, department)

@router.get("/users/me/performance")
async def get_my_performance(
    year: int,
    month: int,
    current_user: dict = Depends(get_current_user)
):
    return await report_service.get_my_performance(year, month, current_user)

@router.get("/users/{user_id}/performance")
async def get_user_performance(
    user_id: str,
    year: int,
    month: int,
    current_user: dict = Depends(get_current_user)
):
    return await report_service.get_user_performance(user_id, year, month, current_user)

@router.post("/reports/approve")
async def approve_report(approval: ApprovalAction, current_user: dict = Depends(require_can_edit("reports"))):
    return await report_service.approve_report(approval, current_user)

@router.post("/reports/cancel-approval")
async def cancel_report_approval(request: CancelApprovalRequest, current_user: dict = Depends(require_can_edit("reports"))):
    return await report_service.cancel_report_approval(request, current_user)

@router.put("/reports/{report_id}")
async def edit_report(
    report_id: str, 
    title: str = Form(None),
    description: str = Form(None),
    site_id: str = Form(None),
    ticket_id: str = Form(None),
    file: Optional[UploadFile] = File(None),
    file_2: Optional[UploadFile] = File(None),
    current_user: dict = Depends(require_can_edit("reports"))
):
    return await report_service.edit_report(report_id, title, description, site_id, ticket_id, file, file_2, current_user)

@router.delete("/reports/{report_id}")
async def delete_report(report_id: str, current_user: dict = Depends(require_can_edit("reports"))):
    return await report_service.delete_report(report_id, current_user)

@router.get("/reports/{report_id}/revisions")
async def get_report_revisions(report_id: str, current_user: dict = Depends(get_current_user)):
    return await report_service.fetch_report_revisions(report_id)

@router.get("/reports/{report_id}/revisions/{version}")
async def get_report_revision_detail(report_id: str, version: int, current_user: dict = Depends(get_current_user)):
    return await report_service.fetch_report_revision_detail(report_id, version)

@router.post("/reports/{report_id}/comments")
async def add_report_comment(report_id: str, comment_data: CommentCreate, current_user: dict = Depends(require_can_edit("reports"))):
    return await report_service.add_report_comment(report_id, comment_data, current_user)
