from fastapi import APIRouter, Depends, Query
from typing import Optional

from utils import get_current_user, require_can_edit
from models import (
    ProjectCreate, ProjectUpdate, PaginatedProjectResponse,
    ProjectTaskCreate, ProjectTaskUpdate, ProjectTaskComment,
    TaskStatusCreate, StatusReorderRequest,
    PaginatedProjectActivityLogResponse, ProjectApprovalAction
)
from services import project_service

router = APIRouter()

@router.post("/projects")
async def create_project(data: ProjectCreate, current_user: dict = Depends(require_can_edit("projects"))):
    return await project_service.create_project(data, current_user)

@router.get("/projects", response_model=PaginatedProjectResponse)
async def list_projects(
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    site_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    return await project_service.fetch_projects(page, limit, search, site_id, current_user)

@router.get("/projects/{project_id}")
async def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    return await project_service.fetch_project_by_id(project_id, current_user)

@router.put("/projects/{project_id}")
async def update_project(project_id: str, data: ProjectUpdate, current_user: dict = Depends(require_can_edit("projects"))):
    return await project_service.update_project(project_id, data, current_user)

@router.delete("/projects/{project_id}")
async def delete_project(project_id: str, current_user: dict = Depends(require_can_edit("projects"))):
    return await project_service.delete_project(project_id, current_user)

@router.get("/projects/export/csv")
async def export_projects_csv(
    site_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user)
):
    return await project_service.generate_projects_csv(site_id, current_user)

@router.post("/projects/{project_id}/approve")
async def approve_project(
    project_id: str, 
    data: ProjectApprovalAction, 
    current_user: dict = Depends(get_current_user)
):
    return await project_service.approve_project(project_id, data, current_user)


@router.get("/projects/{project_id}/statuses")
async def list_statuses(project_id: str, current_user: dict = Depends(get_current_user)):
    return await project_service.fetch_statuses(project_id)

@router.post("/projects/{project_id}/statuses")
async def create_status(project_id: str, data: TaskStatusCreate, current_user: dict = Depends(require_can_edit("projects"))):
    return await project_service.create_status(project_id, data, current_user)

@router.put("/projects/{project_id}/statuses/reorder")
async def reorder_statuses(project_id: str, data: StatusReorderRequest, current_user: dict = Depends(require_can_edit("projects"))):
    return await project_service.reorder_statuses(project_id, data, current_user)

@router.put("/projects/{project_id}/statuses/{status_id}")
async def update_status(project_id: str, status_id: str, data: TaskStatusCreate, current_user: dict = Depends(require_can_edit("projects"))):
    return await project_service.update_status(project_id, status_id, data, current_user)

@router.delete("/projects/{project_id}/statuses/{status_id}")
async def delete_status(project_id: str, status_id: str, current_user: dict = Depends(require_can_edit("projects"))):
    return await project_service.delete_status(project_id, status_id, current_user)


@router.post("/projects/{project_id}/tasks")
async def create_task(project_id: str, data: ProjectTaskCreate, current_user: dict = Depends(require_can_edit("projects"))):
    return await project_service.create_task(project_id, data, current_user)

@router.get("/projects/{project_id}/tasks")
async def list_tasks(
    project_id: str,
    status: Optional[str] = None,
    type: Optional[str] = None,
    priority: Optional[str] = None,
    assignee_id: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    return await project_service.fetch_tasks(project_id, status, type, priority, assignee_id, search)

@router.get("/projects/{project_id}/tasks/{task_id}")
async def get_task(project_id: str, task_id: str, current_user: dict = Depends(get_current_user)):
    return await project_service.fetch_task_by_id(project_id, task_id)

@router.put("/projects/{project_id}/tasks/{task_id}")
async def update_task(project_id: str, task_id: str, data: ProjectTaskUpdate, current_user: dict = Depends(require_can_edit("projects"))):
    return await project_service.update_task(project_id, task_id, data, current_user)

@router.delete("/projects/{project_id}/tasks/{task_id}")
async def delete_task(project_id: str, task_id: str, current_user: dict = Depends(require_can_edit("projects"))):
    return await project_service.delete_task(project_id, task_id, current_user)

@router.post("/projects/{project_id}/tasks/{task_id}/comments")
async def add_task_comment(
    project_id: str,
    task_id: str,
    data: ProjectTaskComment,
    current_user: dict = Depends(get_current_user),
):
    return await project_service.add_task_comment(project_id, task_id, data, current_user)

@router.put("/projects/{project_id}/tasks/{task_id}/comments/{comment_id}")
async def update_task_comment(
    project_id: str,
    task_id: str,
    comment_id: str,
    data: ProjectTaskComment,
    current_user: dict = Depends(get_current_user),
):
    return await project_service.update_task_comment(project_id, task_id, comment_id, data, current_user)

@router.get("/projects/{project_id}/activities", response_model=PaginatedProjectActivityLogResponse)
async def list_project_activities(
    project_id: str,
    page: int = 1,
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
):
    return await project_service.fetch_project_activities(project_id, page, limit)
