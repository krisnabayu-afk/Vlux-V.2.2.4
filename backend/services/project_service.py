import uuid
import csv
import io
from datetime import datetime, timezone
from typing import Optional, List
from fastapi import HTTPException, status, Response

from database import db
from utils import (
    is_sales_user, is_admin_tech_ops, get_tech_ops_department_id, 
    get_sales_department_id, create_notification, send_email
)
from models import (
    Project, ProjectCreate, ProjectUpdate,
    ProjectTask, ProjectTaskCreate, ProjectTaskUpdate, ProjectTaskComment,
    TaskStatus, TaskStatusCreate, StatusReorderRequest,
    ProjectActivityLog, ProjectApprovalAction
)

DEFAULT_STATUSES = [
    {"name": "To Do", "order": 0, "color": "#6b7280"},
    {"name": "In Progress", "order": 1, "color": "#3b82f6"},
    {"name": "Testing", "order": 2, "color": "#8b5cf6"},
    {"name": "Done", "order": 3, "color": "#22c55e"},
]

async def verify_project_access(project_id: str, user_id: str, user_role: str = None, allow_lead: bool = False):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=403, detail="User not found")
        
    is_owner = project.get("created_by") == user_id
    is_superuser = user.get("role") == "SuperUser"
    tech_ops_id = await get_tech_ops_department_id()
    
    is_vp_tech = False
    if user.get("role") == "VP":
        if tech_ops_id and user.get("department_id") == tech_ops_id:
            is_vp_tech = True
        elif user.get("department") == "Technical Operation": 
            is_vp_tech = True

    is_admin_tech = await is_admin_tech_ops(user)
    is_lead = project.get("leader_id") == user_id

    has_access = is_owner or is_superuser or is_vp_tech or is_admin_tech or (allow_lead and is_lead)

    if not has_access:
        raise HTTPException(status_code=403, detail="You do not have permission to manage this project.")
    
    return project

async def log_project_activity(project_id: str, user_id: str, user_name: str, category: str, description: str, payload: dict = None):
    log_entry = ProjectActivityLog(
        project_id=project_id,
        user_id=user_id,
        user_name=user_name,
        action_category=category,
        action_description=description,
        payload=payload or {}
    )
    doc = log_entry.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.project_activities.insert_one(doc)

async def create_project(data: ProjectCreate, current_user: dict):
    existing = await db.projects.find_one({"key": data.key.upper()})
    if existing:
        raise HTTPException(status_code=400, detail=f"Project key '{data.key.upper()}' already exists")

    leader_name = ""
    if data.leader_id:
        leader = await db.users.find_one({"id": data.leader_id}, {"_id": 0, "username": 1})
        if leader:
            leader_name = leader["username"]

    site_name = ""
    if data.site_id:
        site = await db.sites.find_one({"id": data.site_id}, {"_id": 0, "name": 1})
        if site:
            site_name = site["name"]

    sales_user_name = ""
    if data.sales_user_id:
        sales_user = await db.users.find_one({"id": data.sales_user_id}, {"_id": 0, "username": 1})
        if sales_user:
            sales_user_name = sales_user["username"]

    project = Project(
        name=data.name,
        key=data.key.upper(),
        type=data.type,
        description=data.description,
        leader_id=data.leader_id,
        leader_name=leader_name,
        sales_user_id=data.sales_user_id,
        sales_user_name=sales_user_name,
        site_id=data.site_id,
        site_name=site_name,
        due_date=datetime.fromisoformat(data.due_date.replace('Z', '+00:00')) if data.due_date else None,
        created_by=current_user["id"],
        created_by_name=current_user["username"],
    )

    doc = project.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    if project.due_date:
        doc["due_date"] = doc["due_date"].isoformat()
    await db.projects.insert_one(doc)

    for s in DEFAULT_STATUSES:
        status = TaskStatus(
            project_id=project.id,
            name=s["name"],
            order=s["order"],
            color=s["color"],
        )
        sdoc = status.model_dump()
        sdoc["created_at"] = sdoc["created_at"].isoformat()
        await db.task_statuses.insert_one(sdoc)

    await log_project_activity(
        project.id, current_user["id"], current_user["username"],
        "General", f"Created project {data.name}"
    )

    return {"message": "Project created successfully", "id": project.id}

async def fetch_projects(page: int, limit: int, search: Optional[str], site_id: Optional[str], current_user: dict):
    match_stage = {}
    if site_id:
        match_stage["site_id"] = site_id
    
    if search:
        match_stage["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"key": {"$regex": search, "$options": "i"}},
            {"site_name": {"$regex": search, "$options": "i"}},
        ]

    if current_user.get("role") not in ["SuperUser", "VP"] and await is_sales_user(current_user):
        sales_filter = {
            "$or": [
                {"sales_user_id": current_user["id"]},
                {"leader_id": current_user["id"]},
                {"created_by": current_user["id"]}
            ]
        }
        if "$or" in match_stage:
            match_stage = {"$and": [match_stage, sales_filter]}
        else:
            match_stage.update(sales_filter)

    pipeline = []
    if match_stage:
        pipeline.append({"$match": match_stage})
    pipeline.append({"$project": {"_id": 0}})
    pipeline.append({"$sort": {"created_at": -1}})

    skip = (page - 1) * limit
    pipeline.append({
        "$facet": {
            "metadata": [{"$count": "total"}],
            "data": [{"$skip": skip}, {"$limit": limit}],
        }
    })

    result = await db.projects.aggregate(pipeline).to_list(1)
    metadata = result[0]["metadata"]
    data = result[0]["data"]
    total = metadata[0]["total"] if metadata else 0
    total_pages = (total + limit - 1) // limit if limit > 0 else 0

    return {
        "items": data,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }

async def fetch_project_by_id(project_id: str, current_user: dict):
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if current_user.get("role") not in ["SuperUser", "VP"] and await is_sales_user(current_user):
        if project.get("sales_user_id") != current_user["id"] and project.get("leader_id") != current_user["id"] and project.get("created_by") != current_user["id"]:
            raise HTTPException(status_code=403, detail="You do not have permission to view this project.")

    return project

async def update_project(project_id: str, data: ProjectUpdate, current_user: dict):
    if await is_sales_user(current_user):
        raise HTTPException(status_code=403, detail="Sales users cannot modify projects.")
    await verify_project_access(project_id, current_user["id"], current_user.get("role"), allow_lead=True)

    old_project = await db.projects.find_one({"id": project_id})
    if not old_project:
        raise HTTPException(status_code=404, detail="Project not found")

    is_owner = old_project.get("created_by") == current_user["id"]
    is_superuser = current_user.get("role") == "SuperUser"
    tech_ops_id = await get_tech_ops_department_id()
    
    is_vp_tech = False
    if current_user.get("role") == "VP":
        if tech_ops_id and current_user.get("department_id") == tech_ops_id:
            is_vp_tech = True
        elif current_user.get("department") == "Technical Operation":
            is_vp_tech = True
    
    is_admin_tech = await is_admin_tech_ops(current_user)
    is_full_admin = is_owner or is_superuser or is_vp_tech or is_admin_tech

    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}

    if not is_full_admin:
        allowed_keys = ["status", "finished_at", "updated_at"]
        update_dict = {k: v for k, v in update_dict.items() if k in allowed_keys}
        if "status" not in update_dict:
            return {"message": "Nothing to update", "id": project_id}

    if data.leader_id and "leader_id" in update_dict:
        leader = await db.users.find_one({"id": data.leader_id}, {"_id": 0, "username": 1})
        if leader:
            update_dict["leader_name"] = leader["username"]

    if data.sales_user_id and "sales_user_id" in update_dict:
        sales_user = await db.users.find_one({"id": data.sales_user_id}, {"_id": 0, "username": 1})
        if sales_user:
            update_dict["sales_user_name"] = sales_user["username"]

    if data.site_id and "site_id" in update_dict:
        site = await db.sites.find_one({"id": data.site_id}, {"_id": 0, "name": 1})
        if site:
            update_dict["site_name"] = site["name"]

    if data.status == "Finished":
        update_dict["finished_at"] = datetime.now(timezone.utc).isoformat()
    elif data.status and data.status != "Finished":
        update_dict["finished_at"] = None

    if "due_date" in update_dict:
        if update_dict["due_date"]:
            update_dict["due_date"] = datetime.fromisoformat(update_dict["due_date"].replace('Z', '+00:00')).isoformat()
        else:
            update_dict["due_date"] = None

    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()

    changes = []
    field_labels = {
        "name": "Name", "type": "Type", "status": "Status", "description": "Description",
        "leader_id": "Leader", "sales_user_id": "Sales Assigned", "site_id": "Site", "due_date": "Due Date"
    }

    for k, v in update_dict.items():
        if k in ["updated_at", "finished_at", "leader_name", "sales_user_name", "site_name"]:
            continue
        
        old_val = old_project.get(k)
        if old_val != v:
            label = field_labels.get(k, k.replace("_", " ").title())
            display_old = old_val
            display_new = v
            
            if k == "leader_id":
                display_old = old_project.get("leader_name") or old_val
                display_new = update_dict.get("leader_name") or v
            elif k == "sales_user_id":
                display_old = old_project.get("sales_user_name") or old_val
                display_new = update_dict.get("sales_user_name") or v
            elif k == "site_id":
                display_old = old_project.get("site_name") or old_val
                display_new = update_dict.get("site_name") or v
            
            changes.append(f"{label}: '{display_old}' -> '{display_new}'")

    await db.projects.update_one({"id": project_id}, {"$set": update_dict})

    if data.status == "Finished" and old_project.get("status") != "Finished":
        tech_ops_id = await get_tech_ops_department_id()
        sales_id = await get_sales_department_id()
        
        vp_query = {"role": "VP", "account_status": "approved", "$or": []}
        if tech_ops_id: vp_query["$or"].append({"department_id": tech_ops_id})
        if sales_id: vp_query["$or"].append({"department_id": sales_id})
        vp_query["$or"].append({"department": "Technical Operation"})
        vp_query["$or"].append({"department": "Sales"})
        
        vps = await db.users.find(vp_query).to_list(100)
        
        msg = f"Proyek {old_project.get('name')} membutuhkan approval final Anda."
        for vp in vps:
            await create_notification(vp["id"], "Project Finalization", msg, "project", project_id)
            if vp.get("email"):
                html = f"<h3>Project Finalization Approval</h3><p>{msg}</p><p><a href='https://vlux.varnion.net.id/projects/{project_id}'>View Project</a></p>"
                await send_email(vp["email"], "Project Finalization Approval Needed", html)

    if changes:
        description = f"Updated project details: {'; '.join(changes)}"
        await log_project_activity(
            project_id, current_user["id"], current_user["username"],
            "General", description, update_dict
        )

    return {"message": "Project updated successfully"}

async def delete_project(project_id: str, current_user: dict):
    await verify_project_access(project_id, current_user["id"], current_user.get("role"))
    update_dict = {
        "status": "Hold",
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    await db.projects.update_one({"id": project_id}, {"$set": update_dict})
    await log_project_activity(
        project_id, current_user["id"], current_user["username"],
        "General", "Deleted (Archived) project - moved to Hold status"
    )
    return {"message": "Project successfully moved to Hold status"}

async def generate_projects_csv(site_id: Optional[str], current_user: dict):
    query = {}
    site_name_filename = "export"
    
    if site_id:
        query["site_id"] = site_id
        site = await db.sites.find_one({"id": site_id})
        if site:
            site_name_filename = site.get("name", "Site").replace(" ", "_")

    if current_user.get("role") != "SuperUser" and current_user.get("role") != "VP" and current_user.get("department") == "Sales":
        query["$or"] = [
            {"sales_user_id": current_user["id"]},
            {"leader_id": current_user["id"]},
            {"created_by": current_user["id"]}
        ]

    projects = await db.projects.find(query).sort("created_at", -1).to_list(10000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Project Name", "Project Key", "Sales Assigned", "Status", "Created Date", "Finished Date"])

    for p in projects:
        created_date = p.get("created_at")
        if isinstance(created_date, datetime):
            created_date = created_date.strftime("%Y-%m-%d")
        elif isinstance(created_date, str):
            try:
                dt = datetime.fromisoformat(created_date.replace("Z", "+00:00"))
                created_date = dt.strftime("%Y-%m-%d")
            except:
                pass
        
        finished_date = p.get("finished_at")
        if isinstance(finished_date, datetime):
            finished_date = finished_date.strftime("%Y-%m-%d")
        elif isinstance(finished_date, str):
            try:
                dt = datetime.fromisoformat(finished_date.replace("Z", "+00:00"))
                finished_date = dt.strftime("%Y-%m-%d")
            except:
                pass
        
        writer.writerow([
            p.get("name", ""),
            p.get("key", ""),
            p.get("sales_user_name", ""),
            p.get("status", ""),
            created_date or "",
            finished_date or ""
        ])

    output.seek(0)
    response = Response(content=output.getvalue(), media_type="text/csv")
    filename = f"Projects_{site_name_filename}.csv" if site_id else "projects_export.csv"
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response

async def approve_project(project_id: str, data: ProjectApprovalAction, current_user: dict):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if current_user.get("role") != "VP":
        raise HTTPException(status_code=403, detail="Only VPs can approve project finalization.")

    update_fields = {}
    now = datetime.now(timezone.utc).isoformat()
    
    if data.type == "tech":
        tech_ops_id = await get_tech_ops_department_id()
        is_authorized = (tech_ops_id and current_user.get("department_id") == tech_ops_id) or \
                        (current_user.get("department") == "Technical Operation")
        
        if not is_authorized:
            raise HTTPException(status_code=403, detail="Only the Technical Operations VP can provide technical approval.")
        
        update_fields = {
            "tech_vp_approved_at": now,
            "tech_vp_user_id": current_user["id"],
            "tech_vp_user_name": current_user["username"]
        }
        log_desc = "Approved by VP Teknis"
        
    elif data.type == "sales":
        sales_id = await get_sales_department_id()
        is_authorized = (sales_id and current_user.get("department_id") == sales_id) or \
                        (current_user.get("department") == "Sales")
        
        if not is_authorized:
            raise HTTPException(status_code=403, detail="Only the Sales VP can provide sales approval.")
            
        update_fields = {
            "sales_vp_approved_at": now,
            "sales_vp_user_id": current_user["id"],
            "sales_vp_user_name": current_user["username"]
        }
        log_desc = "Approved by VP Sales"
    else:
        raise HTTPException(status_code=400, detail="Invalid approval type.")

    tech_approved = project.get("tech_vp_approved_at") or (data.type == "tech")
    sales_approved = project.get("sales_vp_approved_at") or (data.type == "sales")
    
    if tech_approved and sales_approved:
        update_fields["status"] = "FINAL / COMPLETED"
        update_fields["finished_at"] = now
        log_desc += ". Project status changed to FINAL / COMPLETED."

    update_fields["updated_at"] = now
    await db.projects.update_one({"id": project_id}, {"$set": update_fields})
    
    await log_project_activity(
        project_id, current_user["id"], current_user["username"],
        "General", log_desc, update_fields
    )
    
    return {"message": "Approval recorded successfully", "completed": tech_approved and sales_approved}

async def fetch_statuses(project_id: str):
    statuses = await db.task_statuses.find(
        {"project_id": project_id}, {"_id": 0}
    ).sort("order", 1).to_list(100)
    return statuses

async def create_status(project_id: str, data: TaskStatusCreate, current_user: dict):
    await verify_project_access(project_id, current_user["id"], current_user.get("role"))
    status = TaskStatus(
        project_id=project_id,
        name=data.name,
        order=data.order,
        color=data.color,
    )
    doc = status.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.task_statuses.insert_one(doc)
    return {"message": "Status created", "id": status.id}

async def reorder_statuses(project_id: str, data: StatusReorderRequest, current_user: dict):
    await verify_project_access(project_id, current_user["id"], current_user.get("role"))
    for item in data.statuses:
        await db.task_statuses.update_one(
            {"id": item.id, "project_id": project_id},
            {"$set": {"order": item.order}},
        )
    return {"message": "Statuses reordered"}

async def update_status(project_id: str, status_id: str, data: TaskStatusCreate, current_user: dict):
    await verify_project_access(project_id, current_user["id"], current_user.get("role"))
    result = await db.task_statuses.update_one(
        {"id": status_id, "project_id": project_id},
        {"$set": {"name": data.name, "order": data.order, "color": data.color}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Status not found")
    return {"message": "Status updated"}

async def delete_status(project_id: str, status_id: str, current_user: dict):
    await verify_project_access(project_id, current_user["id"], current_user.get("role"))
    status = await db.task_statuses.find_one({"id": status_id, "project_id": project_id}, {"_id": 0})
    if not status:
        raise HTTPException(status_code=404, detail="Status not found")

    task_count = await db.project_tasks.count_documents({"project_id": project_id, "status": status["name"]})
    if task_count > 0:
        raise HTTPException(status_code=400, detail=f"Cannot delete status: {task_count} task(s) still use it")

    await db.task_statuses.delete_one({"id": status_id})
    return {"message": "Status deleted"}

async def create_task(project_id: str, data: ProjectTaskCreate, current_user: dict):
    if await is_sales_user(current_user):
        raise HTTPException(status_code=403, detail="Sales users cannot create tasks.")
    project = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    result = await db.projects.find_one_and_update(
        {"id": project_id},
        {"$inc": {"task_counter": 1}},
        return_document=True,
        projection={"_id": 0, "task_counter": 1, "key": 1},
    )
    counter = result["task_counter"]
    project_key = result["key"]
    task_number = f"{project_key}-{counter}"

    assignee_name = ""
    if data.assignee_id:
        assignee = await db.users.find_one({"id": data.assignee_id}, {"_id": 0, "username": 1})
        if assignee:
            assignee_name = assignee["username"]

    start_date = datetime.fromisoformat(data.start_date.replace('Z', '+00:00')) if data.start_date else None
    end_date = datetime.fromisoformat(data.end_date.replace('Z', '+00:00')) if data.end_date else None

    if project.get("due_date"):
        project_due_str = project["due_date"]
        project_due = datetime.fromisoformat(project_due_str.replace('Z', '+00:00')) if isinstance(project_due_str, str) else project_due_str
        
        if start_date and start_date.date() > project_due.date():
            raise HTTPException(status_code=400, detail=f"Tanggal issue tidak boleh melebihi Dead Line project ({project_due.strftime('%d-%m-%Y')}).")
        if end_date and end_date.date() > project_due.date():
            raise HTTPException(status_code=400, detail=f"Tanggal issue tidak boleh melebihi Dead Line project ({project_due.strftime('%d-%m-%Y')}).")

    task = ProjectTask(
        project_id=project_id,
        project_key=project_key,
        task_number=task_number,
        title=data.title,
        description=data.description,
        type=data.type,
        status=data.status,
        priority=data.priority,
        assignee_id=data.assignee_id,
        assignee_name=assignee_name,
        reporter_id=current_user["id"],
        reporter_name=current_user["username"],
        start_date=start_date,
        end_date=end_date,
        color_hex=data.color_hex or "#3b82f6",
    )

    doc = task.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    await db.project_tasks.insert_one(doc)

    await log_project_activity(
        project_id, current_user["id"], current_user["username"],
        "Task", f"Created task {task_number}: {data.title}"
    )

    return {"message": "Task created", "id": task.id, "task_number": task_number}

async def fetch_tasks(project_id: str, status: Optional[str], type: Optional[str], priority: Optional[str], assignee_id: Optional[str], search: Optional[str]):
    match_stage = {"project_id": project_id}
    if status:
        match_stage["status"] = status
    if type:
        match_stage["type"] = type
    if priority:
        match_stage["priority"] = priority
    if assignee_id:
        match_stage["assignee_id"] = assignee_id
    if search:
        match_stage["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"task_number": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
        ]

    tasks = await db.project_tasks.find(
        match_stage, {"_id": 0}
    ).sort("created_at", -1).to_list(1000)
    return tasks

async def fetch_task_by_id(project_id: str, task_id: str):
    task = await db.project_tasks.find_one(
        {"id": task_id, "project_id": project_id}, {"_id": 0}
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

async def update_task(project_id: str, task_id: str, data: ProjectTaskUpdate, current_user: dict):
    if await is_sales_user(current_user):
        raise HTTPException(status_code=403, detail="Sales users can only comment on tasks, not edit them.")
    task = await db.project_tasks.find_one({"id": task_id, "project_id": project_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_dict = {k: v for k, v in data.model_dump().items() if v is not None}

    if data.assignee_id:
        assignee = await db.users.find_one({"id": data.assignee_id}, {"_id": 0, "username": 1})
        if assignee:
            update_dict["assignee_name"] = assignee["username"]

    if "start_date" in update_dict and update_dict["start_date"]:
        update_dict["start_date"] = datetime.fromisoformat(update_dict["start_date"].replace('Z', '+00:00')).isoformat()
    if "end_date" in update_dict and update_dict["end_date"]:
        update_dict["end_date"] = datetime.fromisoformat(update_dict["end_date"].replace('Z', '+00:00')).isoformat()

    project = await db.projects.find_one({"id": project_id})
    if project and project.get("due_date"):
        project_due_str = project["due_date"]
        project_due = datetime.fromisoformat(project_due_str.replace('Z', '+00:00')) if isinstance(project_due_str, str) else project_due_str
        
        start_date_str = update_dict.get("start_date") or task.get("start_date")
        end_date_str = update_dict.get("end_date") or task.get("end_date")
        
        if start_date_str:
            start_date = datetime.fromisoformat(start_date_str.replace('Z', '+00:00')) if isinstance(start_date_str, str) else start_date_str
            if start_date.date() > project_due.date():
                raise HTTPException(status_code=400, detail=f"Tanggal issue tidak boleh melebihi Dead Line project ({project_due.strftime('%d-%m-%Y')}).")
        
        if end_date_str:
            end_date = datetime.fromisoformat(end_date_str.replace('Z', '+00:00')) if isinstance(end_date_str, str) else end_date_str
            if end_date.date() > project_due.date():
                raise HTTPException(status_code=400, detail=f"Tanggal issue tidak boleh melebihi Dead Line project ({project_due.strftime('%d-%m-%Y')}).")

    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.project_tasks.update_one({"id": task_id}, {"$set": update_dict})

    changes = []
    field_labels = {
        "title": "Title", "description": "Description", "type": "Type", "status": "Status",
        "priority": "Priority", "assignee_id": "Assignee", "start_date": "Start Date", "end_date": "End Date", "color_hex": "Color"
    }

    for k, v in update_dict.items():
        if k in ["updated_at", "assignee_name"]:
            continue
        
        old_val = task.get(k)
        if str(old_val) != str(v):
            label = field_labels.get(k, k.replace("_", " ").title())
            display_old = old_val
            display_new = v
            
            if k == "assignee_id":
                display_old = task.get("assignee_name") or old_val
                display_new = update_dict.get("assignee_name") or v
            
            changes.append(f"{label}: '{display_old}' -> '{display_new}'")
    
    desc = f"Updated task {task.get('task_number')}"
    if changes:
        desc += f": {'; '.join(changes)}"

    await log_project_activity(
        project_id, current_user["id"], current_user["username"],
        "Task", desc, update_dict
    )

    return {"message": "Task updated"}

async def delete_task(project_id: str, task_id: str, current_user: dict):
    if await is_sales_user(current_user):
        raise HTTPException(status_code=403, detail="Sales users cannot delete tasks.")
    task = await db.project_tasks.find_one({"id": task_id, "project_id": project_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    await db.project_tasks.delete_one({"id": task_id})
    return {"message": "Task deleted"}

async def add_task_comment(project_id: str, task_id: str, data: ProjectTaskComment, current_user: dict):
    task = await db.project_tasks.find_one({"id": task_id, "project_id": project_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    comment = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "user_name": current_user["username"],
        "comment": data.comment,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    await db.project_tasks.update_one(
        {"id": task_id},
        {
            "$push": {"comments": comment},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()},
        },
    )

    await log_project_activity(
        project_id, current_user["id"], current_user["username"],
        "Comment", f"Added comment to task {task.get('task_number')}: {data.comment[:50]}{'...' if len(data.comment) > 50 else ''}"
    )

    return {"message": "Comment added"}

async def update_task_comment(project_id: str, task_id: str, comment_id: str, data: ProjectTaskComment, current_user: dict):
    task = await db.project_tasks.find_one({"id": task_id, "project_id": project_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    comments = task.get("comments", [])
    comment_index = next((i for i, c in enumerate(comments) if c["id"] == comment_id), -1)
    
    if comment_index == -1:
        raise HTTPException(status_code=404, detail="Comment not found")
        
    comment = comments[comment_index]
    
    if comment["user_id"] != current_user["id"] and current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="You can only edit your own comments.")

    if comment.get("comment") == data.comment:
        return {"message": "No changes made"}

    now = datetime.now(timezone.utc).isoformat()
    
    history_entry = {
        "content": comment.get("comment"),
        "edited_at": comment.get("updated_at") or comment.get("created_at")
    }
    
    edit_history = comment.get("edit_history", [])
    edit_history.append(history_entry)
    
    await db.project_tasks.update_one(
        {"id": task_id, "comments.id": comment_id},
        {
            "$set": {
                "comments.$.comment": data.comment,
                "comments.$.updated_at": now,
                "comments.$.is_edited": True,
                "comments.$.edit_history": edit_history,
                "updated_at": now
            }
        }
    )

    await log_project_activity(
        project_id, current_user["id"], current_user["username"],
        "Comment", f"Edited comment on task {task.get('task_number')}"
    )

    return {"message": "Comment updated"}

async def fetch_project_activities(project_id: str, page: int, limit: int):
    project = await db.projects.find_one({"id": project_id})
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    pipeline = [
        {"$match": {"project_id": project_id}},
        {"$project": {"_id": 0}},
        {"$sort": {"created_at": -1}}
    ]

    skip = (page - 1) * limit
    pipeline.append({
        "$facet": {
            "metadata": [{"$count": "total"}],
            "data": [{"$skip": skip}, {"$limit": limit}],
        }
    })

    result = await db.project_activities.aggregate(pipeline).to_list(1)
    metadata = result[0]["metadata"]
    data = result[0]["data"]
    total = metadata[0]["total"] if metadata else 0
    total_pages = (total + limit - 1) // limit if limit > 0 else 0

    return {
        "items": data,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages,
    }
