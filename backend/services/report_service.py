import os
import shutil
import uuid
import csv
import io
from datetime import datetime, timezone, timedelta
from typing import Optional, Any
from fastapi import HTTPException, UploadFile, Response

from database import db, UPLOAD_DIR
from utils import create_notification, is_admin_tech_ops
from models import Report, Comment, CommentCreate, ApprovalAction, CancelApprovalRequest

async def get_effective_department(user_or_doc: dict) -> Optional[str]:
    dept = user_or_doc.get("department")
    if not dept:
        org_config = await db.org_config.find_one({"id": "org_config"})
        tech_ops_id = org_config.get("division_mappings", {}).get("tech_ops_department_id") if org_config else None
        if tech_ops_id and user_or_doc.get("department_id") == tech_ops_id:
            return "Technical Operation"
        
        division = user_or_doc.get("division")
        if division in ["Monitoring", "Infra", "TS", "Apps", "Fiberzone", "Admin", "Internal Support"]:
            return "Technical Operation"
    return dept

async def get_mapped_division_name(division_name: str, division_id: Optional[str] = None) -> str:
    if not division_name and not division_id:
        return ""
        
    org_config = await db.org_config.find_one({"id": "org_config"})
    if org_config and org_config.get("division_hierarchy"):
        hierarchy = org_config["division_hierarchy"]
        child_to_parent = {}
        for parent_id, children in hierarchy.items():
            for child_id in children:
                child_to_parent[child_id] = parent_id
                
        if division_id and division_id in child_to_parent:
            parent_div = await db.divisions.find_one({"id": child_to_parent[division_id]})
            if parent_div:
                return parent_div["name"]
                
        if child_to_parent and division_name:
            all_ids = list(child_to_parent.keys()) + list(child_to_parent.values())
            divs = await db.divisions.find({"id": {"$in": all_ids}}).to_list(None)
            div_names = {d["id"]: d["name"] for d in divs}
            name_to_id = {d["name"]: d["id"] for d in divs}
            
            div_id = name_to_id.get(division_name)
            if div_id and div_id in child_to_parent:
                parent_id = child_to_parent[div_id]
                parent_name = div_names.get(parent_id)
                if parent_name:
                    return parent_name

    if division_name == "Apps": return "TS"
    if division_name == "Fiberzone": return "Infra"
    
    return division_name

async def check_report_auth_meta(report: dict, current_user: dict) -> dict:
    can_approve = False
    can_cancel_approval = False
    
    if not current_user or not current_user.get("role") or not report or not report.get("submitted_by"):
        return {"can_approve": False, "can_cancel_approval": False}
        
    role = current_user["role"]
    status = report.get("status")
    
    if current_user.get("division") == "Admin":
        return {"can_approve": False, "can_cancel_approval": False}
        
    submitter = await db.users.find_one({"id": report["submitted_by"]}, {"_id": 0})
    
    auth_region = submitter.get("region") if submitter else report.get("submitted_by_region")
    
    report_division = submitter.get("division") if submitter else report.get("division")
    report_dept = report.get("department")
    if not report_dept and submitter:
        report_dept = await get_effective_department(submitter)

    report_division = await get_mapped_division_name(report_division, submitter.get("division_id") if submitter else report.get("division_id"))
    
    user_region = current_user.get("region")
    is_global_user = user_region in ["Global", "All Regions", None, ""]
    
    if status not in ["Final", "Revisi"] and role in ["SPV", "Manager", "VP"]:
        is_authorized = False
        
        if role == "VP":
            vp_dept = await get_effective_department(current_user)
            if vp_dept and report_dept and vp_dept == report_dept:
                is_authorized = True
        elif role == "Manager":
            if is_global_user or user_region == auth_region:
                if current_user.get("division") == report_division:
                    if status == "Pending SPV":
                        is_authorized = True
                    elif status == "Pending Manager":
                        if not report.get("current_approver") or report.get("current_approver") == current_user["id"]:
                            is_authorized = True
        elif role == "SPV":
            if is_global_user or user_region == auth_region:
                if current_user.get("division") == report_division:
                    if status == "Pending SPV":
                        is_authorized = True
                        
        if report.get("current_approver") == current_user["id"]:
            is_authorized = True
            
        can_approve = is_authorized

    if status not in ["Pending SPV", "Pending Manager", "Revisi"]:
        is_authorized = False
        
        if role == "VP":
            vp_dept = await get_effective_department(current_user)
            if vp_dept and report_dept and vp_dept == report_dept:
                is_authorized = True
        elif role == "Manager":
            if (is_global_user or user_region == auth_region) and current_user.get("division") == report_division:
                if status in ["Pending VP", "Final"]:
                    is_authorized = True
        elif role == "SPV":
            if (is_global_user or user_region == auth_region) and current_user.get("division") == report_division:
                if status == "Pending Manager":
                    is_authorized = True
                    
        can_cancel_approval = is_authorized
        
    return {"can_approve": can_approve, "can_cancel_approval": can_cancel_approval}

async def create_report(title: str, description: Optional[str], ticket_id: Optional[str], site_id: Optional[str], category_id: Optional[str], file: UploadFile, file_2: Optional[UploadFile], current_user: dict):
    site_name = None
    site_region = None
    folder_name = "Unassigned"
    if site_id:
        site = await db.sites.find_one({"id": site_id}, {"_id": 0})
        if site:
            site_name = site["name"]
            site_region = site.get("region")
            folder_name = "".join(c for c in site_name if c.isalnum() or c in (' ', '-', '_')).strip().replace(' ', '_')
            
    reports_dir = UPLOAD_DIR / "reports" / folder_name
    reports_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
    file_extension = os.path.splitext(file.filename)[1]
    unique_filename = f"report_{timestamp}_{uuid.uuid4().hex[:8]}{file_extension}"
    file_path = reports_dir / unique_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    file_url = f"/uploads/reports/{folder_name}/{unique_filename}"
    file_data = None
    
    file_2_name = None
    file_2_url = None
    file_2_data = None
    if file_2:
        file_2_extension = os.path.splitext(file_2.filename)[1]
        unique_filename_2 = f"report_2_{timestamp}_{uuid.uuid4().hex[:8]}{file_2_extension}"
        file_path_2 = reports_dir / unique_filename_2
        with open(file_path_2, "wb") as buffer:
            shutil.copyfileobj(file_2.file, buffer)
        file_2_name = file_2.filename
        file_2_url = f"/uploads/reports/{folder_name}/{unique_filename_2}"
        
    category_name = None
    if category_id:
        category = await db.activity_categories.find_one({"id": category_id}, {"_id": 0})
        if category:
            category_name = category["name"]
            
    target_division = current_user.get("division")
    target_division_id = current_user.get("division_id")
    target_division = await get_mapped_division_name(target_division, target_division_id)
                
    target_region = site_region if site_region else current_user.get("region")
    status = "Pending Manager"
    current_approver = None
    
    if current_user["role"] in ["Staff", "SPV"]:
        status = "Pending Manager"
        search_divisions = [target_division]
        query = {"role": "Manager", "division": {"$in": search_divisions}, "account_status": "approved"}
        if target_region:
             query["region"] = target_region
        manager = await db.users.find_one(query, {"_id": 0})
        if not manager and target_region:
             query["region"] = {"$in": [None, "", "Global", "All Regions"]}
             manager = await db.users.find_one(query, {"_id": 0})
        if not manager:
             if "region" in query: del query["region"]
             manager = await db.users.find_one(query, {"_id": 0})

        if not manager:
             error_msg = f"No Manager found for division {target_division}"
             if target_region: error_msg += f" in region {target_region}"
             raise HTTPException(status_code=400, detail=error_msg + ". Please contact administrator.")
        
        current_approver = manager["id"]
        
    elif current_user["role"] == "Manager":
        status = "Pending VP"
        vp_query = {"role": "VP", "account_status": "approved"}
        if current_user.get("department"):
            vp_query["department"] = current_user.get("department")
        vp = await db.users.find_one(vp_query, {"_id": 0})
        if not vp:
            raise HTTPException(status_code=400, detail="No VP account found in your department to approve this report.")
        current_approver = vp["id"]
    elif current_user["role"] == "VP":
        status = "Final"
        current_approver = None
        
    report = Report(
        category_id=category_id,
        category_name=category_name,
        title=title,
        description=description,
        file_name=file.filename,
        file_data=file_data,
        file_url=file_url,
        file_2_name=file_2_name,
        file_2_data=file_2_data,
        file_2_url=file_2_url,
        status=status,
        submitted_by=current_user["id"],
        submitted_by_name=current_user["username"],
        current_approver=current_approver,
        department=current_user.get("department"),
        ticket_id=ticket_id,
        site_id=site_id,
        site_name=site_name,
        site_region=site_region if site_id else None
    )
    
    doc = report.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.reports.insert_one(doc)

    if ticket_id:
        await db.tickets.update_one(
            {"id": ticket_id},
            {"$set": {"linked_report_id": report.id, "updated_at": datetime.now(timezone.utc).isoformat()}}
        )

    if current_approver:
        await create_notification(
            user_id=current_approver,
            title="Report Need to Review",
            message=f"{current_user['username']} submitted: {title} - {site_name}",
            notification_type="report",
            related_id=report.id
        )
    return {"message": "Report submitted successfully", "id": report.id}

async def fetch_reports(page: int, limit: int, site_id: Optional[str], ticket_id: Optional[str], division: Optional[str], region: Optional[str], search: Optional[str], mine: bool, approving: bool, sort: str, current_user: dict):
    pipeline = []
    match_stage = {}
    if site_id:
        match_stage["site_id"] = site_id
    if ticket_id:
        match_stage["ticket_id"] = ticket_id
    if region and region != 'all':
        match_stage["site_region"] = region
    if search:
        match_stage["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"submitted_by_name": {"$regex": search, "$options": "i"}},
            {"site_name": {"$regex": search, "$options": "i"}}
        ]
    if mine:
        match_stage["submitted_by"] = current_user["id"]
        
    manager_approving_logic = False
    is_admin_tech = await is_admin_tech_ops(current_user)
    
    if approving:
        user_role = current_user.get("role", "").upper()
        if user_role == "VP":
            match_stage["status"] = "Pending VP"
            vp_dept = await get_effective_department(current_user)
            if vp_dept:
                match_stage["department"] = vp_dept
            else:
                match_stage["department"] = "__NONE__" 
        elif user_role == "MANAGER":
            match_stage["status"] = {"$in": ["Pending SPV", "Pending Manager"]}
            if current_user.get("department"):
                match_stage["department"] = current_user["department"]
            manager_approving_logic = True
        elif user_role == "SPV":
            match_stage["status"] = "Pending SPV"
            if current_user.get("department"):
                match_stage["department"] = current_user["department"]
            manager_approving_logic = True
        elif user_role in ["SUPERUSER", "ADMIN"] or is_admin_tech:
            match_stage["status"] = {"$in": ["Pending SPV", "Pending Manager", "Pending VP"]}
        else:
            match_stage["status"] = {"$ne": "Final"}
            
    if current_user.get("role") not in ["SuperUser"] and not approving and not mine and not is_admin_tech:
        user_dept_name = current_user.get("department")
        if user_dept_name:
            dept_doc = await db.departments.find_one({"name": user_dept_name}, {"_id": 0})
            if dept_doc:
                perm_doc = await db.department_permissions.find_one(
                    {"department_id": dept_doc["id"], "menu_key": "reports"}, {"_id": 0}
                )
                if perm_doc and perm_doc.get("report_visibility") == "final_only":
                    match_stage["status"] = "Final"

    if match_stage:
        pipeline.append({"$match": match_stage})
        
    needs_lookup = (division and division != "all") or manager_approving_logic
    if needs_lookup:
        pipeline.append({
            "$addFields": {
                "submitted_by_str": {"$toString": "$submitted_by"}
            }
        })
        pipeline.append({
            "$lookup": {
                "from": "users",
                "localField": "submitted_by_str",
                "foreignField": "id",
                "as": "submitter_info"
            }
        })
        pipeline.append({"$unwind": {"path": "$submitter_info", "preserveNullAndEmptyArrays": True}})
        
        if division and division != "all":
            if division == "Infra & Fiberzone":
                div_list = ["Infra", "Fiberzone"]
            elif division == "TS & Apps":
                div_list = ["TS", "Apps"]
            elif division == "Monitoring": 
                div_list = ["Monitoring"]
            else:
                div_list = [division]
            
            pipeline.append({
                "$match": {
                    "$or": [
                        {"submitter_info.division": {"$in": div_list}},
                        {"division": {"$in": div_list}}
                    ]
                }
            })
            
        if manager_approving_logic:
            org_config = await db.org_config.find_one({"id": "org_config"})
            branches = []
            if org_config and org_config.get("division_hierarchy"):
                hierarchy = org_config["division_hierarchy"]
                child_to_parent = {}
                for parent_id, children in hierarchy.items():
                    for child_id in children:
                        child_to_parent[child_id] = parent_id
                        
                if child_to_parent:
                    all_ids = list(child_to_parent.keys()) + list(child_to_parent.values())
                    divs = await db.divisions.find({"id": {"$in": all_ids}}).to_list(None)
                    div_names = {d["id"]: d["name"] for d in divs}
                    
                    for child_id, parent_id in child_to_parent.items():
                        child_name = div_names.get(child_id)
                        parent_name = div_names.get(parent_id)
                        if child_name and parent_name:
                            branches.append({"case": {"$eq": ["$submitter_info.division", child_name]}, "then": parent_name})
            
            if not branches:
                branches = [
                    {"case": {"$eq": ["$submitter_info.division", "Apps"]}, "then": "TS"},
                    {"case": {"$eq": ["$submitter_info.division", "Fiberzone"]}, "then": "Infra"}
                ]
                
            pipeline.append({
                "$addFields": {
                    "mapped_submitter_div": {
                        "$cond": {
                            "if": {"$eq": ["$department", "Technical Operation"]},
                            "then": {
                                "$switch": {
                                    "branches": branches,
                                    "default": "$submitter_info.division"
                                }
                            },
                            "else": "$submitter_info.division"
                        }
                    }
                }
            })
            
            approval_match = {"mapped_submitter_div": current_user.get("division")}
            user_region = current_user.get("region")
            if user_region and user_region not in ["Global", "All Regions", ""]:
                approval_match["submitter_info.region"] = user_region
                
            pipeline.append({"$match": approval_match})
            
        pipeline.append({"$project": {"submitter_info": 0, "mapped_submitter_div": 0, "submitted_by_str": 0}})
        
    pipeline.append({"$project": {"file_data": 0, "_id": 0}})
    
    pipeline.append({
        "$addFields": {
            "sort_priority": {
                "$cond": {
                    "if": {"$eq": ["$status", "Final"]},
                    "then": 1,
                    "else": 0
                }
            }
        }
    })
    
    sort_direction = -1 if sort == "newest" else 1
    
    pipeline.append({
        "$sort": {
            "sort_priority": 1,
            "created_at": sort_direction
        }
    })
    
    skip = (page - 1) * limit
    facet_stage = {
        "$facet": {
            "metadata": [{"$count": "total"}],
            "data": [{"$skip": skip}, {"$limit": limit}]
        }
    }
    pipeline.append(facet_stage)
    
    result = await db.reports.aggregate(pipeline).to_list(1)
    metadata = result[0]["metadata"]
    data = result[0]["data"]
    total = metadata[0]["total"] if metadata else 0
    total_pages = (total + limit - 1) // limit if limit > 0 else 0
    
    for report in data:
        auth_meta = await check_report_auth_meta(report, current_user)
        report["can_approve"] = auth_meta["can_approve"]
        report["can_cancel_approval"] = auth_meta["can_cancel_approval"]
        
    return {
        "items": data,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }

async def generate_reports_csv(site_id: Optional[str]):
    query = {"status": "Final"}
    site_name_filename = "export"
    
    if site_id:
        query["site_id"] = site_id
        site = await db.sites.find_one({"id": site_id})
        if site:
            site_name_filename = site.get("name", "Site").replace(" ", "_")

    reports = await db.reports.find(query).sort("created_at", -1).to_list(10000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Report Date", "Title", "Created By", "Status"])

    for r in reports:
        report_date = r.get("created_at")
        if isinstance(report_date, datetime):
            report_date = report_date.strftime("%Y-%m-%d %H:%M:%S")
        elif isinstance(report_date, str):
            try:
                dt = datetime.fromisoformat(report_date.replace("Z", "+00:00"))
                report_date = dt.strftime("%Y-%m-%d %H:%M:%S")
            except:
                pass
        
        writer.writerow([
            report_date or "",
            r.get("title", ""),
            r.get("submitted_by_name", ""),
            r.get("status", "")
        ])

    output.seek(0)
    response = Response(content=output.getvalue(), media_type="text/csv")
    filename = f"Reports_{site_name_filename}.csv" if site_id else "reports_export.csv"
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response

async def fetch_report_by_id(report_id: str, current_user: dict):
    report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    auth_meta = await check_report_auth_meta(report, current_user)
    report["can_approve"] = auth_meta["can_approve"]
    report["can_cancel_approval"] = auth_meta["can_cancel_approval"]
    return report

async def get_user_report_statistics(year: int, month: Optional[int], category_id: Optional[str], region: Optional[str], view_type: str):
    try:
        if view_type == "annual":
            start_date = datetime(year, 1, 1, tzinfo=timezone.utc)
            end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc) - timedelta(microseconds=1)
        else:
            if not month:
                raise ValueError("Month is required for monthly view")
            start_date = datetime(year, month, 1, tzinfo=timezone.utc)
            if month == 12:
                end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc) - timedelta(microseconds=1)
            else:
                end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc) - timedelta(microseconds=1)
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid month or year")
    query = {
        "created_at": {
            "$gte": start_date.isoformat(),
            "$lte": end_date.isoformat()
        }
    }
    if category_id and category_id != "all":
        query["category_id"] = category_id
    if region and region != 'all':
        query["site_region"] = region
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$submitted_by_name",
            "count": {"$sum": 1}
        }},
        {"$project": {
            "name": "$_id",
            "value": "$count",
            "_id": 0
        }}
    ]
    stats = await db.reports.aggregate(pipeline).to_list(None)
    return stats

async def get_site_report_statistics(year: int, month: Optional[int], category_id: Optional[str], region: Optional[str], view_type: str):
    try:
        if view_type == "annual":
            start_date = datetime(year, 1, 1, tzinfo=timezone.utc)
            end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc) - timedelta(microseconds=1)
        else:
            if not month:
                raise ValueError("Month is required for monthly view")
            start_date = datetime(year, month, 1, tzinfo=timezone.utc)
            if month == 12:
                end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc) - timedelta(microseconds=1)
            else:
                end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc) - timedelta(microseconds=1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid month or year")
    query = {
        "created_at": {
            "$gte": start_date.isoformat(),
            "$lte": end_date.isoformat()
        }
    }
    if category_id and category_id != "all":
        query["category_id"] = category_id
    if region and region != 'all':
        query["site_region"] = region
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$site_name",
            "count": {"$sum": 1}
        }},
        {"$match": {"_id": {"$ne": None, "$ne": ""}}},
        {"$project": {
            "name": "$_id",
            "value": "$count",
            "_id": 0
        }}
    ]
    stats = await db.reports.aggregate(pipeline).to_list(None)
    return stats

async def get_category_report_statistics(year: int, month: Optional[int], region: Optional[str], view_type: str):
    try:
        if view_type == "annual":
            start_date = datetime(year, 1, 1, tzinfo=timezone.utc)
            end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc) - timedelta(microseconds=1)
        else:
            if not month:
                raise ValueError("Month is required for monthly view")
            start_date = datetime(year, month, 1, tzinfo=timezone.utc)
            if month == 12:
                end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc) - timedelta(microseconds=1)
            else:
                end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc) - timedelta(microseconds=1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid month or year")
    query = {
        "created_at": {
            "$gte": start_date.isoformat(),
            "$lte": end_date.isoformat()
        }
    }
    if region and region != 'all':
        query["site_region"] = region
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$category_name",
            "count": {"$sum": 1}
        }},
        {"$match": {"_id": {"$ne": None, "$ne": ""}}},
        {"$project": {
            "name": "$_id",
            "value": "$count",
            "_id": 0
        }}
    ]
    stats = await db.reports.aggregate(pipeline).to_list(None)
    return stats

async def generate_statistics_csv(year: int, region: Optional[str], category_id: Optional[str], dimension: str):
    try:
        start_date = datetime(year, 1, 1, tzinfo=timezone.utc)
        end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc) - timedelta(microseconds=1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid year")
    query = {
        "created_at": {
            "$gte": start_date.isoformat(),
            "$lte": end_date.isoformat()
        }
    }
    if category_id and category_id != "all":
        query["category_id"] = category_id
    if region and region != 'all':
        query["site_region"] = region
        
    if dimension == "user":
        group_id = "$submitted_by_name"
    elif dimension == "site":
        group_id = "$site_name"
    else: 
        group_id = "$category_name"
        
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": group_id,
            "count": {"$sum": 1}
        }},
        {"$match": {"_id": {"$ne": None, "$ne": ""}}}, 
        {"$project": {
            "name": "$_id",
            "value": "$count",
            "_id": 0
        }}
    ]
    stats = await db.reports.aggregate(pipeline).to_list(None)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    if dimension == "user":
        header_name = "User Name"
    elif dimension == "site":
        header_name = "Site Name"
    else:
        header_name = "Category Name"
    writer.writerow([header_name, "Report Count"])
    
    for item in stats:
        writer.writerow([item["name"], item["value"]])
        
    return Response(content=output.getvalue(), media_type="text/csv", headers={
        "Content-Disposition": f"attachment; filename=statistics_{year}_{dimension}.csv"
    })

async def get_rating_leaderboard(year: int, month: Optional[int], view_type: str, region: Optional[str], department: Optional[str]):
    try:
        if view_type == "monthly" and month:
            start_date = datetime(year, month, 1, tzinfo=timezone.utc)
            if month == 12:
                end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc) - timedelta(microseconds=1)
            else:
                end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc) - timedelta(microseconds=1)
        else:
            start_date = datetime(year, 1, 1, tzinfo=timezone.utc)
            end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc) - timedelta(microseconds=1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date parameters")
    query = {
        "status": "Final",
        "final_score": {"$ne": None, "$exists": True},
        "updated_at": {
            "$gte": start_date.isoformat(),
            "$lte": end_date.isoformat()
        }
    }
    if region and region != "all":
        query["site_region"] = region
    if department and department != "all":
        query["department"] = department
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$submitted_by",
            "user_name": {"$first": "$submitted_by_name"},
            "avg_score": {"$avg": "$final_score"},
            "report_count": {"$sum": 1}
        }},
        {"$lookup": {
            "from": "users",
            "localField": "_id",
            "foreignField": "id",
            "as": "user_info"
        }},
        {"$project": {
            "user_id": "$_id",
            "user_name": 1,
            "avg_score": {"$round": ["$avg_score", 2]},
            "report_count": 1,
            "division": {"$arrayElemAt": ["$user_info.division", 0]},
            "region": {"$arrayElemAt": ["$user_info.region", 0]},
            "_id": 0
        }},
        {"$sort": {"avg_score": -1}}
    ]
    leaderboard = await db.reports.aggregate(pipeline).to_list(None)
    return leaderboard

async def get_my_performance(year: int, month: int, current_user: dict):
    user_id = current_user["id"]
    try:
        monthly_start = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            monthly_end = datetime(year + 1, 1, 1, tzinfo=timezone.utc) - timedelta(microseconds=1)
        else:
            monthly_end = datetime(year, month + 1, 1, tzinfo=timezone.utc) - timedelta(microseconds=1)
        yearly_start = datetime(year, 1, 1, tzinfo=timezone.utc)
        yearly_end = datetime(year + 1, 1, 1, tzinfo=timezone.utc) - timedelta(microseconds=1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date parameters")
    base_query = {
        "submitted_by": user_id,
        "status": "Final",
        "final_score": {"$ne": None, "$exists": True}
    }
    monthly_query = {**base_query, "updated_at": {"$gte": monthly_start.isoformat(), "$lte": monthly_end.isoformat()}}
    monthly_reports = await db.reports.find(monthly_query, {"_id": 0, "final_score": 1, "manager_notes": 1, "vp_notes": 1, "title": 1, "updated_at": 1}).to_list(None)
    monthly_scores = [r["final_score"] for r in monthly_reports if r.get("final_score") is not None]
    monthly_avg = round(sum(monthly_scores) / len(monthly_scores), 2) if monthly_scores else None
    
    yearly_query = {**base_query, "updated_at": {"$gte": yearly_start.isoformat(), "$lte": yearly_end.isoformat()}}
    yearly_scores_raw = await db.reports.find(yearly_query, {"_id": 0, "final_score": 1}).to_list(None)
    yearly_scores = [r["final_score"] for r in yearly_scores_raw if r.get("final_score") is not None]
    yearly_avg = round(sum(yearly_scores) / len(yearly_scores), 2) if yearly_scores else None
    
    recent_feedback_reports = await db.reports.find(
        {**base_query},
        {"_id": 0, "title": 1, "manager_rating": 1, "manager_notes": 1, "vp_rating": 1, "vp_notes": 1, "final_score": 1, "updated_at": 1}
    ).sort("updated_at", -1).limit(5).to_list(None)
    
    feedback = []
    for r in recent_feedback_reports:
        if r.get("manager_notes") or r.get("vp_notes"):
            feedback.append({
                "title": r.get("title"),
                "manager_rating": r.get("manager_rating"),
                "manager_notes": r.get("manager_notes"),
                "vp_rating": r.get("vp_rating"),
                "vp_notes": r.get("vp_notes"),
                "final_score": r.get("final_score"),
                "date": r.get("updated_at")
            })
    return {
        "monthly_avg": monthly_avg,
        "monthly_count": len(monthly_scores),
        "yearly_avg": yearly_avg,
        "yearly_count": len(yearly_scores),
        "recent_feedback": feedback
    }

async def get_user_performance(user_id: str, year: int, month: int, current_user: dict):
    if current_user["id"] != user_id and current_user["role"] not in ["SuperUser", "VP", "Manager", "SPV"]:
        raise HTTPException(status_code=403, detail="Not authorized to view this user's performance")
    try:
        monthly_start = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            monthly_end = datetime(year + 1, 1, 1, tzinfo=timezone.utc) - timedelta(microseconds=1)
        else:
            monthly_end = datetime(year, month + 1, 1, tzinfo=timezone.utc) - timedelta(microseconds=1)
        yearly_start = datetime(year, 1, 1, tzinfo=timezone.utc)
        yearly_end = datetime(year + 1, 1, 1, tzinfo=timezone.utc) - timedelta(microseconds=1)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date parameters")
    base_query = {
        "submitted_by": user_id,
        "status": "Final",
        "final_score": {"$ne": None, "$exists": True}
    }
    monthly_query = {**base_query, "updated_at": {"$gte": monthly_start.isoformat(), "$lte": monthly_end.isoformat()}}
    monthly_reports = await db.reports.find(monthly_query, {"_id": 0, "final_score": 1}).to_list(None)
    monthly_scores = [r["final_score"] for r in monthly_reports if r.get("final_score") is not None]
    monthly_avg = round(sum(monthly_scores) / len(monthly_scores), 2) if monthly_scores else None
    
    yearly_query = {**base_query, "updated_at": {"$gte": yearly_start.isoformat(), "$lte": yearly_end.isoformat()}}
    yearly_scores_raw = await db.reports.find(yearly_query, {"_id": 0, "final_score": 1}).to_list(None)
    yearly_scores = [r["final_score"] for r in yearly_scores_raw if r.get("final_score") is not None]
    yearly_avg = round(sum(yearly_scores) / len(yearly_scores), 2) if yearly_scores else None
    
    recent_feedback_reports = await db.reports.find(
        {**base_query},
        {"_id": 0, "title": 1, "manager_rating": 1, "manager_notes": 1, "vp_rating": 1, "vp_notes": 1, "final_score": 1, "updated_at": 1}
    ).sort("updated_at", -1).limit(5).to_list(None)
    
    feedback = []
    for r in recent_feedback_reports:
        if r.get("manager_notes") or r.get("vp_notes"):
            feedback.append({
                "title": r.get("title"),
                "manager_rating": r.get("manager_rating"),
                "manager_notes": r.get("manager_notes"),
                "vp_rating": r.get("vp_rating"),
                "vp_notes": r.get("vp_notes"),
                "final_score": r.get("final_score"),
                "date": r.get("updated_at")
            })
    return {
        "monthly_avg": monthly_avg,
        "monthly_count": len(monthly_scores),
        "yearly_avg": yearly_avg,
        "yearly_count": len(yearly_scores),
        "recent_feedback": feedback
    }

async def approve_report(approval: ApprovalAction, current_user: dict):
    if current_user.get("division") == "Admin":
        raise HTTPException(status_code=403, detail="Users in Admin division cannot perform report approvals")
    report = await db.reports.find_one({"id": approval.report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
        
    submitter = await db.users.find_one({"id": report["submitted_by"]}, {"_id": 0})
    site = await db.sites.find_one({"id": report.get("site_id")}, {"_id": 0})
    report_region = site.get("region") if site else submitter.get("region") if submitter else report.get("submitted_by_region")
    auth_region = submitter.get("region") if submitter else report.get("submitted_by_region")
    
    report_division = submitter.get("division") if submitter else report.get("division")
    report_dept = report.get("department")
    if not report_dept and submitter:
        report_dept = await get_effective_department(submitter)

    report_division = await get_mapped_division_name(report_division, submitter.get("division_id") if submitter else report.get("division_id"))
        
    is_authorized = False
    bypass_mode = None 
    
    user_region = current_user.get("region")
    is_global_user = user_region in ["Global", "All Regions", None, ""]

    if current_user["role"] == "VP":
        vp_dept = await get_effective_department(current_user)
        if vp_dept and report_dept and vp_dept == report_dept:
            is_authorized = True
            bypass_mode = "vp_override"
            
    elif current_user["role"] == "Manager":
        if is_global_user or user_region == auth_region:
            if current_user.get("division") == report_division:
                if report["status"] == "Pending SPV":
                    is_authorized = True
                    bypass_mode = "manager_bypass"
                elif report["status"] == "Pending Manager":
                    if not report.get("current_approver") or report.get("current_approver") == current_user["id"]:
                        is_authorized = True
                    
    elif current_user["role"] == "SPV":
        if is_global_user or user_region == auth_region:
            if current_user.get("division") == report_division:
                if report["status"] == "Pending SPV":
                    is_authorized = True
                    
    if report.get("current_approver") == current_user["id"]:
        is_authorized = True
        
    if not is_authorized:
        raise HTTPException(status_code=403, detail="You are not authorized to approve this report (Region/Division mismatch).")
        
    if approval.action == "revisi":
        if not approval.comment:
            raise HTTPException(status_code=400, detail="Comment is required for revisi")
        await db.reports.update_one(
            {"id": approval.report_id},
            {
                "$set": {
                    "status": "Revisi",
                    "rejection_comment": approval.comment,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }
            }
        )
        await create_notification(
            user_id=report["submitted_by"],
            title="Report Needs Revision",
            message=f"Your report '{report['title']}' needs revision: {approval.comment}",
            notification_type="report",
            related_id=approval.report_id
        )
        return {"message": "Report sent for revision"}
        
    if approval.action == "approve" and current_user["role"] in ["Manager", "VP"]:
        if approval.rating is not None and not (1 <= approval.rating <= 5):
            raise HTTPException(status_code=400, detail="Rating must be between 1 and 5")
            
    new_status = report["status"]
    new_approver = None
    
    if report["status"] == "Pending SPV":
        if current_user["role"] == "Manager" or current_user["role"] == "VP":
            if current_user["role"] == "VP":
                new_status = "Final"
                new_approver = None
            else:
                new_status = "Pending VP"
        else:
            new_status = "Pending Manager"

        if new_status == "Pending Manager":
            search_divisions = [await get_mapped_division_name(submitter.get("division"), submitter.get("division_id"))]
            query = {
                "role": "Manager", 
                "division": {"$in": search_divisions},
                "region": auth_region,
                "account_status": "approved"
            }
            managers = await db.users.find(query, {"_id": 0}).to_list(None)
            if not managers:
                query["region"] = {"$in": [None, "", "Global", "All Regions"]}
                managers = await db.users.find(query, {"_id": 0}).to_list(None)
            if not managers:
                del query["region"]
                managers = await db.users.find(query, {"_id": 0}).to_list(None)
            
            if managers:
                new_approver = managers[0]["id"]
                for mgr in managers:
                    await create_notification(user_id=mgr["id"], title="Ada Report Baru!", message=f"Report '{report['title']}' is awaiting your action", notification_type="report", related_id=approval.report_id)
            else:
                raise HTTPException(status_code=400, detail=f"Cannot proceed: No Manager found for {search_divisions}")

        elif new_status == "Pending VP":
            vp_query = {"role": "VP", "account_status": "approved"}
            if report_dept: 
                vp_query["department"] = report_dept
            vps = await db.users.find(vp_query, {"_id": 0}).to_list(None)
            if vps:
                new_approver = vps[0]["id"]
                for vp in vps:
                    await create_notification(user_id=vp["id"], title="Report Needs Action", message=f"Report '{report['title']}' is awaiting your action", notification_type="report", related_id=approval.report_id)
            else:
                raise HTTPException(status_code=400, detail="No VP found to approve this report.")
                
    elif report["status"] == "Pending Manager":
        new_status = "Pending VP"
        vp_query = {"role": "VP", "account_status": "approved"}
        if report_dept:
            vp_query["department"] = report_dept
        vps = await db.users.find(vp_query, {"_id": 0}).to_list(None)
        if vps:
            new_approver = vps[0]["id"]
            for vp in vps:
                await create_notification(
                    user_id=vp["id"],
                    title="Report Needs Action",
                    message=f"Report '{report['title']}' is awaiting your action",
                    notification_type="report",
                    related_id=approval.report_id
                )
                
    elif report["status"] == "Pending VP":
        new_status = "Final"
        new_approver = None
        
    if current_user["role"] == "VP":
        new_status = "Final"
        new_approver = None
        
    rating_update: dict[str, Any] = {}
    if approval.action == "approve" and current_user["role"] in ["Manager", "VP"] and approval.rating is not None:
        if current_user["role"] == "Manager":
            rating_update["manager_rating"] = approval.rating
            rating_update["manager_notes"] = approval.notes or ""
        elif current_user["role"] == "VP":
            rating_update["vp_rating"] = approval.rating
            rating_update["vp_notes"] = approval.notes or ""
            
    if new_status == "Final":
        manager_rating = rating_update.get("manager_rating", report.get("manager_rating"))
        vp_rating = rating_update.get("vp_rating", report.get("vp_rating"))
        if manager_rating is not None and vp_rating is not None:
            rating_update["final_score"] = (manager_rating + vp_rating) / 2
        elif vp_rating is not None:
            rating_update["final_score"] = float(vp_rating)
        elif manager_rating is not None:
            rating_update["final_score"] = float(manager_rating)
            
    audit_message = f"Approved by {current_user['username']} ({current_user['role']})"
    if bypass_mode == "manager_bypass":
        audit_message += " (Manager Approved)"
    elif bypass_mode == "vp_override":
        audit_message += " (VP Approved)"
    
    if approval.notes:
        audit_message += f" — Feedback: {approval.notes}"

    audit_comment = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "user_name": "System",
        "text": audit_message,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    update_fields = {
        "status": new_status,
        "current_approver": new_approver,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        **rating_update
    }
    await db.reports.update_one(
        {"id": approval.report_id},
        {
            "$set": update_fields,
            "$push": {"comments": audit_comment}
        }
    )
    if new_status == "Final":
        await create_notification(
            user_id=report["submitted_by"],
            title="Report Approved",
            message=f"Your report '{report['title']}' has been fully approved! Tolong diupload ke notes",
            notification_type="report",
            related_id=approval.report_id
        )
    return {"message": "Report approved", "new_status": new_status}

async def cancel_report_approval(request: CancelApprovalRequest, current_user: dict):
    if current_user.get("division") == "Admin":
        raise HTTPException(status_code=403, detail="Users in Admin division cannot perform report actions")
    report = await db.reports.find_one({"id": request.report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    current_status = report["status"]
    if current_status in ["Pending SPV", "Pending Manager", "Revisi"]:
        raise HTTPException(status_code=400, detail="Cannot cancel approval at this stage")
        
    submitter = await db.users.find_one({"id": report["submitted_by"]}, {"_id": 0})
    site = await db.sites.find_one({"id": report.get("site_id")}, {"_id": 0})
    auth_region = submitter.get("region") if submitter else report.get("submitted_by_region")
    
    report_division = submitter.get("division") if submitter else report.get("division")
    report_dept = report.get("department")
    if not report_dept and submitter:
        report_dept = await get_effective_department(submitter)

    report_division = await get_mapped_division_name(report_division, submitter.get("division_id") if submitter else report.get("division_id"))
        
    is_authorized = False
    user_region = current_user.get("region")
    is_global_user = user_region in ["Global", "All Regions", None, ""]
    
    if current_user["role"] == "VP":
        vp_dept = await get_effective_department(current_user)
        if vp_dept and report_dept and vp_dept == report_dept:
            is_authorized = True
    elif current_user["role"] == "Manager":
        if (is_global_user or user_region == auth_region) and current_user.get("division") == report_division:
            if current_status in ["Pending VP", "Final"]:
                is_authorized = True
    elif current_user["role"] == "SPV":
        if (is_global_user or user_region == auth_region) and current_user.get("division") == report_division:
            if current_status == "Pending Manager":
                is_authorized = True

    if not is_authorized:
        raise HTTPException(status_code=403, detail="You are not authorized to cancel this approval")

    new_status = None
    new_approver = None
    if current_status == "Final":
        new_status = "Pending VP"
        vp_query = {"role": "VP", "account_status": "approved"}
        if report_dept:
            vp_query["department"] = report_dept
        vp = await db.users.find_one(vp_query, {"_id": 0})
        if vp:
            new_approver = vp["id"]
    elif current_status == "Pending VP":
        new_status = "Pending Manager"
        manager_query = {
            "role": "Manager",
            "division": report_division,
            "account_status": "approved"
        }
        if auth_region:
            manager_query["region"] = auth_region
            
        manager = await db.users.find_one(manager_query, {"_id": 0})
        if manager:
            new_approver = manager["id"]
        else:
            raise HTTPException(status_code=400, detail=f"Cannot revert: No Manager found for {report_division} in region {auth_region}")
    elif current_status == "Pending Manager":
        raise HTTPException(status_code=400, detail="Cannot cancel: Status is already at the first approval stage (Manager). Use 'Revisi' if you want to send it back to staff.")
        
    audit_comment = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "user_name": "System",
        "text": f"System Audit: Approval cancelled by {current_user['role']} {current_user['username']}. Status reverted from {current_status} to {new_status}",
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.reports.update_one(
        {"id": request.report_id},
        {
            "$set": {
                "status": new_status,
                "current_approver": new_approver,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"comments": audit_comment}
        }
    )
    if new_approver:
        await create_notification(
            user_id=new_approver,
            title="Report Approval Cancelled - Action Required",
            message=f"Report '{report['title']}' approval was cancelled and is now awaiting your review",
            notification_type="report",
            related_id=request.report_id
        )
    return {"message": "Approval cancelled successfully", "new_status": new_status}

async def edit_report(report_id: str, title: Optional[str], description: Optional[str], site_id: Optional[str], ticket_id: Optional[str], file: Optional[UploadFile], file_2: Optional[UploadFile], current_user: dict):
    report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report["submitted_by"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only edit your own reports")
        
    update_dict: dict[str, Any] = {}
    if title:
        update_dict["title"] = title
    if description:
        update_dict["description"] = description
    if site_id is not None:
        update_dict["site_id"] = site_id if site_id != "" else None
        if update_dict["site_id"]:
            site = await db.sites.find_one({"id": update_dict["site_id"]}, {"_id": 0})
            if site:
                update_dict["site_name"] = site["name"]
        else:
            update_dict["site_name"] = None
    if ticket_id is not None:
        update_dict["ticket_id"] = ticket_id if ticket_id != "" else None
        
    if file:
        effective_site_id = site_id if site_id is not None else report.get("site_id")
        folder_name = "Unassigned"
        if effective_site_id:
             site = await db.sites.find_one({"id": effective_site_id}, {"_id": 0})
             if site:
                 folder_name = "".join(c for c in site["name"] if c.isalnum() or c in (' ', '-', '_')).strip().replace(' ', '_')
                 
        reports_dir = UPLOAD_DIR / "reports" / folder_name
        reports_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"report_{timestamp}_{uuid.uuid4().hex[:8]}{file_extension}"
        file_path = reports_dir / unique_filename
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        update_dict["file_name"] = file.filename
        update_dict["file_url"] = f"/uploads/reports/{folder_name}/{unique_filename}"
        update_dict["file_data"] = None 
        
    if file_2:
        effective_site_id = site_id if site_id is not None else report.get("site_id")
        folder_name = "Unassigned"
        if effective_site_id:
             site = await db.sites.find_one({"id": effective_site_id}, {"_id": 0})
             if site:
                 folder_name = "".join(c for c in site["name"] if c.isalnum() or c in (' ', '-', '_')).strip().replace(' ', '_')
        reports_dir = UPLOAD_DIR / "reports" / folder_name
        reports_dir.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        file_extension = os.path.splitext(file_2.filename)[1]
        unique_filename = f"report_2_{timestamp}_{uuid.uuid4().hex[:8]}{file_extension}"
        file_path = reports_dir / unique_filename
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file_2.file, buffer)
        update_dict["file_2_name"] = file_2.filename
        update_dict["file_2_url"] = f"/uploads/reports/{folder_name}/{unique_filename}"
        update_dict["file_2_data"] = None

    if report["status"] == "Revisi":
        report_creator = await db.users.find_one({"id": report["submitted_by"]}, {"_id": 0})
        if not report_creator:
            raise HTTPException(status_code=404, detail="Report creator not found")
            
        effective_site_id = update_dict.get("site_id", report.get("site_id"))
        effective_site_region = None
        if effective_site_id:
             s = await db.sites.find_one({"id": effective_site_id}, {"_id": 0})
             if s: effective_site_region = s.get("region")
             
        target_region = effective_site_region if effective_site_region else report_creator.get("region")
        target_division = await get_mapped_division_name(report_creator.get("division"), report_creator.get("division_id"))
        status = "Pending Manager"
        first_approver = None
        
        if report_creator["role"] in ["Staff", "SPV"]:
             status = "Pending Manager"
             query = {"role": "Manager", "division": target_division, "account_status": "approved"}
             if target_region: query["region"] = target_region
             managers = await db.users.find(query, {"_id": 0}).to_list(None)
             if not managers:
                 error_msg = f"No Manager found for division {target_division}"
                 if target_region: error_msg += f" in region {target_region}"
                 raise HTTPException(status_code=400, detail=error_msg)
             first_approver = managers[0]["id"]
        elif report_creator["role"] == "Manager":
             status = "Pending VP"
             vp_query = {"role": "VP", "account_status": "approved"}
             creator_dept = report_creator.get("department")
             if creator_dept:
                 vp_query["department"] = creator_dept
             vps = await db.users.find(vp_query, {"_id": 0}).to_list(None)
             if not vps:
                 raise HTTPException(status_code=400, detail="No VP found in your department")
             first_approver = vps[0]["id"]
        elif report_creator["role"] == "VP":
             status = "Final"
             first_approver = None
             
        if status != "Final":
            update_dict["status"] = status
            update_dict["current_approver"] = first_approver
            update_dict["rejection_comment"] = None 
            if first_approver:
                recipients = []
                if status == "Pending Manager":
                     recipients = await db.users.find(query, {"_id": 0}).to_list(None)
                elif status == "Pending VP":
                     recipients = await db.users.find({"role": "VP", "account_status": "approved"}, {"_id": 0}).to_list(None)
                if recipients:
                    for recipient in recipients:
                        await create_notification(
                            user_id=recipient["id"],
                            title="Resubmitted Report Needs Approval",
                            message=f"Resubmitted report '{update_dict.get('title', report['title'])}' is awaiting your approval",
                            notification_type="report",
                            related_id=report["id"]
                        )
        else:
             update_dict["status"] = "Final"
             update_dict["current_approver"] = None
             update_dict["rejection_comment"] = None
             
    revision_doc = {
        "id": str(uuid.uuid4()),
        "report_id": report_id,
        "version": report["version"],
        "title": report["title"],
        "description": report.get("description"),
        "file_name": report.get("file_name"),
        "file_url": report.get("file_url"),
        "file_data": report.get("file_data"),
        "file_2_name": report.get("file_2_name"),
        "file_2_url": report.get("file_2_url"),
        "file_2_data": report.get("file_2_data"),
        "updated_at": report.get("updated_at") or report.get("created_at")
    }
    await db.report_revisions.insert_one(revision_doc)
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    update_dict["version"] = report["version"] + 1
    await db.reports.update_one(
        {"id": report_id},
        {"$set": update_dict}
    )
    return {"message": "Report updated successfully"}

async def delete_report(report_id: str, current_user: dict):
    report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    if report["submitted_by"] != current_user["id"] and current_user["role"] not in ["Manager", "VP"]:
        raise HTTPException(status_code=403, detail="Not authorized to delete this report")
        
    if report.get("ticket_id"):
        await db.tickets.update_one(
            {"id": report["ticket_id"]},
            {"$unset": {"linked_report_id": ""}}
        )
    await db.tickets.update_many(
        {"linked_report_id": report_id},
        {"$unset": {"linked_report_id": ""}}
    )
    
    await db.notifications.delete_many({"related_id": report_id})
    await db.reports.delete_one({"id": report_id})
    await db.report_revisions.delete_many({"report_id": report_id})
    return {"message": "Report deleted successfully"}

async def fetch_report_revisions(report_id: str):
    report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    revisions = await db.report_revisions.find({"report_id": report_id}, {"_id": 0}).sort("version", -1).to_list(100)
    return revisions

async def fetch_report_revision_detail(report_id: str, version: int):
    revision = await db.report_revisions.find_one({"report_id": report_id, "version": version}, {"_id": 0})
    if not revision:
        raise HTTPException(status_code=404, detail="Revision not found")
    return revision

async def add_report_comment(report_id: str, comment_data: CommentCreate, current_user: dict):
    report = await db.reports.find_one({"id": report_id}, {"_id": 0})
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    comment = Comment(
        user_id=current_user["id"],
        user_name=current_user["username"],
        text=comment_data.text
    )
    comment_doc = comment.model_dump()
    comment_doc['created_at'] = comment_doc['created_at'].isoformat()
    await db.reports.update_one(
        {"id": report_id},
        {"$push": {"comments": comment_doc}}
    )
    
    if report["submitted_by"] != current_user["id"]:
        await create_notification(
            user_id=report["submitted_by"],
            title="New Comment on Report",
            message=f"{current_user['username']} commented on '{report['title']}'",
            notification_type="report",
            related_id=report_id
        )
    return {"message": "Comment added successfully"}
