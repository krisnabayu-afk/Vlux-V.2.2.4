import csv
import io
import math
from datetime import datetime, timezone, timedelta
from typing import Optional, Any
from fastapi import HTTPException, status, UploadFile, Response

from database import db
from utils import (
    create_notification, MONITORING_SHIFTS, is_admin_tech_ops, get_tech_ops_department_id,
    validate_division_hierarchy, resolve_division_id_from_user
)
from models import ScheduleCreate, Schedule, ScheduleUpdate, ShiftChangeRequestCreate, ShiftChangeRequest, ShiftChangeReviewAction

async def create_schedule(schedule_data: ScheduleCreate, current_user: dict):
    if current_user["role"] not in ["VP", "Manager", "SPV"]:
        raise HTTPException(status_code=403, detail="Only VP, Managers, and SPV can create schedules")
    site = await db.sites.find_one({"id": schedule_data.site_id}, {"_id": 0})
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
        
    start_dt = datetime.fromisoformat(schedule_data.start_date)
    if schedule_data.end_date:
        end_date = datetime.fromisoformat(schedule_data.end_date)
    else:
        end_date = start_dt.replace(hour=23, minute=59, second=59, microsecond=0)
        
    category_name = None
    if schedule_data.category_id:
        category = await db.activity_categories.find_one({"id": schedule_data.category_id}, {"_id": 0})
        if category:
            category_name = category["name"]
            
    created_ids = []
    for user_id in schedule_data.user_ids:
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            continue
            
        user_end_date = end_date
        if user.get("division") == "Monitoring":
            if category_name not in MONITORING_SHIFTS:
                raise HTTPException(status_code=400, detail=f"Monitoring users must be assigned a shift (Shift Pagi/Siang/Malam/SOS). Got: {category_name}")
            shift = MONITORING_SHIFTS[category_name]
            if shift["start"] and start_dt.strftime("%H:%M") != shift["start"]:
                raise HTTPException(status_code=400, detail=f"{category_name} for Monitoring must start at {shift['start']}")
            if shift["end"]:
                h, m = map(int, shift["end"].split(':'))
                user_end_date = start_dt.replace(hour=h, minute=m, second=0, microsecond=0)
                if shift["next_day"]:
                    user_end_date += timedelta(days=1)
                    
        target_department = user.get("department")
        if not target_department:
            tech_ops_id = await get_tech_ops_department_id()
            if tech_ops_id and user.get("department_id") == tech_ops_id:
                target_department = "Technical Operation"
            elif user.get("division_id") == tech_ops_id:
                target_department = "Technical Operation"
            elif user.get("division") in ["Monitoring", "Infra", "TS", "Apps", "Fiberzone", "Admin", "Internal Support"]:
                target_department = "Technical Operation"
            elif user.get("division") in ["Core Network"]:
                target_department = "Core Network & Access"
                
        if current_user["role"] == "VP" and current_user.get("department"):
            if target_department != current_user.get("department"):
                raise HTTPException(status_code=403, detail=f"No permission to assign to staff in {target_department} department")
                
        if current_user["role"] in ["Manager", "SPV"]:
            is_admin_tech = await is_admin_tech_ops(current_user)
            tech_ops_dept_id = await get_tech_ops_department_id()
            
            if is_admin_tech:
                is_same_dept = target_department == current_user.get("department")
                is_tech_ops = (tech_ops_dept_id and user.get("department_id") == tech_ops_dept_id)
                if not is_same_dept and not is_tech_ops:
                    raise HTTPException(status_code=403, detail=f"Admin can only assign staff within their own department or the Technical Operations department")
            else:
                user_div_id = await resolve_division_id_from_user(current_user)
                target_div_id = await resolve_division_id_from_user(user)
                div_allowed = await validate_division_hierarchy(user_div_id, target_div_id)
                if not div_allowed:
                    raise HTTPException(status_code=403, detail=f"No permission to assign to {user['username']} ({user.get('division', 'Unknown Division')})")
                
                current_region = current_user.get("region")
                target_region = user.get("region")
                if current_region and target_region and current_region != target_region:
                    raise HTTPException(status_code=403, detail=f"No permission to assign to {user['username']} in different region ({target_region})")
                    
        schedule = Schedule(
            user_id=user["id"],
            user_name=user["username"],
            division=user.get("division", ""),
            category_id=schedule_data.category_id,
            category_name=category_name,
            title=schedule_data.title,
            description=schedule_data.description,
            start_date=datetime.fromisoformat(schedule_data.start_date),
            end_date=user_end_date,
            created_by=current_user["id"],
            ticket_id=schedule_data.ticket_id,
            site_id=schedule_data.site_id,
            site_name=site.get("name"),
            site_region=site.get("region"),
            product=schedule_data.product
        )
        doc = schedule.model_dump()
        doc['start_date'] = doc['start_date'].isoformat()
        doc['end_date'] = doc['end_date'].isoformat() if doc['end_date'] else None
        doc['created_at'] = doc['created_at'].isoformat()
        await db.schedules.insert_one(doc)
        created_ids.append(schedule.id)
        
        await create_notification(
            user_id=user["id"],
            title="You Got New Schedule Assigned!",
            message=f"Kamu dijadwalkan untuk: {schedule.title} {schedule.site_name or ''} {schedule.start_date.strftime('%Y-%m-%d %H:%M')} s/d {schedule.end_date.strftime('%H:%M') if schedule.end_date else ''}",
            notification_type="schedule",
            related_id=schedule.id
        )
    return {"message": f"{len(created_ids)} schedules created successfully", "ids": created_ids}

async def bulk_upload_schedules(file: UploadFile, current_user: dict):
    if current_user["role"] not in ["VP", "Manager", "SPV"]:
        raise HTTPException(status_code=403, detail="Only VP, Managers, and SPV can bulk upload")
    if not file.filename.endswith(('.csv', '.xlsx')):
        raise HTTPException(status_code=400, detail="Only CSV or XLSX files are supported")
        
    content = await file.read()
    try:
        decoded = content.decode('utf-8')
        csv_reader = csv.DictReader(io.StringIO(decoded))
        created_count = 0
        errors = []
        
        for row_num, row in enumerate(csv_reader, start=2):
            try:
                user = await db.users.find_one({"email": row['user_email']}, {"_id": 0})
                if not user:
                    errors.append(f"Row {row_num}: User not found - {row['user_email']}")
                    continue
                    
                if current_user["role"] in ["Manager", "SPV"]:
                    user_div_id = await resolve_division_id_from_user(current_user)
                    target_div_id = await resolve_division_id_from_user(user)
                    allowed = await validate_division_hierarchy(user_div_id, target_div_id)
                    if not allowed:
                        errors.append(f"Row {row_num}: Cannot assign schedule to user from different division")
                        continue
                        
                if user.get("division") == "Monitoring":
                    if row['title'] in MONITORING_SHIFTS:
                        shift = MONITORING_SHIFTS[row['title']]
                        if shift["start"] and shift["end"]:
                            s_dt = datetime.fromisoformat(row['start_date'])
                            e_dt = datetime.fromisoformat(row['end_date'])
                            if s_dt.strftime("%H:%M") != shift["start"] or e_dt.strftime("%H:%M") != shift["end"]:
                                errors.append(f"Row {row_num}: {row['title']} must be from {shift['start']} to {shift['end']}")
                                continue
                    else:
                        errors.append(f"Row {row_num}: Monitoring users must have a valid shift title (Shift Pagi/Siang/Malam/SOS)")
                        continue
                        
                schedule = Schedule(
                    user_id=user["id"],
                    user_name=user["username"],
                    division=user.get("division", ""),
                    title=row['title'],
                    description=row.get('description', ''),
                    start_date=datetime.fromisoformat(row['start_date']),
                    end_date=datetime.fromisoformat(row['end_date']),
                    created_by=current_user["id"]
                )
                doc = schedule.model_dump()
                doc['start_date'] = doc['start_date'].isoformat()
                doc['end_date'] = doc['end_date'].isoformat()
                doc['created_at'] = doc['created_at'].isoformat()
                await db.schedules.insert_one(doc)
                
                await create_notification(
                    user_id=user["id"],
                    title="New Schedule Assigned",
                    message=f"You have been assigned to: {schedule.title} - {schedule.site_name or ''} - {schedule.start_date.strftime('%Y-%m-%d %H:%M')}",
                    notification_type="schedule",
                    related_id=schedule.id
                )
                created_count += 1
            except Exception as e:
                errors.append(f"Row {row_num}: {str(e)}")
                
        return {
            "message": f"Bulk upload completed. {created_count} schedules created.",
            "created_count": created_count,
            "errors": errors
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")

async def fetch_schedules(region: Optional[str], site_id: Optional[str]):
    query = {}
    if region and region != 'all':
        query["site_region"] = region
    if site_id:
        query["site_id"] = site_id

    schedules = await db.schedules.find(query, {"_id": 0}).to_list(10000)

    creator_ids = list(set(s.get("created_by") for s in schedules if s.get("created_by")))
    if creator_ids:
        creators = await db.users.find({"id": {"$in": creator_ids}}, {"_id": 0, "id": 1, "username": 1}).to_list(None)
        creator_map = {c["id"]: c["username"] for c in creators}
        for s in schedules:
            s["created_by_name"] = creator_map.get(s.get("created_by"), "")

    return schedules

async def generate_schedules_csv(month: Optional[int], year: Optional[int], site_id: Optional[str]):
    query = {}
    start_dt = None
    if month and year:
        start_dt = datetime(year, month, 1, tzinfo=timezone.utc)
        if month == 12:
            end_dt = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
        else:
            end_dt = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        query["start_date"] = {
            "$gte": start_dt.isoformat(),
            "$lt": end_dt.isoformat()
        }

    site_name_filename = "export"
    if site_id:
        query["site_id"] = site_id
        site = await db.sites.find_one({"id": site_id})
        if site:
            site_name_filename = site.get("name", "Site").replace(" ", "_")

    schedules = await db.schedules.find(query).sort("start_date", 1).to_list(None)
    
    fz_schedules = []
    if site_id:
        fz_query = {"site_id": site_id}
        if month and year:
            fz_query["start_time"] = {
                "$gte": start_dt.isoformat(),
                "$lt": end_dt.isoformat()
            }
        fz_schedules = await db.fiberzone_schedules.find(fz_query).sort("start_time", 1).to_list(None)

    user_ids = list(set([s.get("user_id") for s in schedules] + [s.get("user_id") for s in fz_schedules]))
    users_data = await db.users.find({"id": {"$in": user_ids}}, {"id": 1, "division": 1}).to_list(None)
    user_div_map = {u["id"]: u.get("division", "") for u in users_data}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Start Date", "End Date", "Duration", "Person", "Division", "Product", "Title", "Status"])

    combined = []
    for s in schedules:
        combined.append({
            "start": s.get("start_date"),
            "end": s.get("end_date"),
            "person": s.get("user_name", ""),
            "division": s.get("division") or user_div_map.get(s.get("user_id"), ""),
            "product": s.get("product", ""),
            "title": s.get("title", ""),
            "status": "Scheduled"
        })
    
    for s in fz_schedules:
        combined.append({
            "start": s.get("start_time"),
            "end": s.get("end_time"),
            "person": s.get("user_name", ""),
            "division": user_div_map.get(s.get("user_id"), "Fiberzone"),
            "product": s.get("product", "Fiberzone"),
            "title": s.get("title", ""),
            "status": s.get("status", "Scheduled")
        })
    
    combined.sort(key=lambda x: x["start"] or "")

    for s in combined:
        start_str = datetime.fromisoformat(s["start"]).strftime("%Y-%m-%d %H:%M") if s["start"] else ""
        end_str = datetime.fromisoformat(s["end"]).strftime("%Y-%m-%d %H:%M") if s["end"] else ""
        
        duration_str = ""
        if s["start"] and s["end"]:
            try:
                start_dt = datetime.fromisoformat(s["start"])
                end_dt = datetime.fromisoformat(s["end"])
                diff = end_dt - start_dt
                hours = round(diff.total_seconds() / 3600.0, 2)
                if hours >= 0:
                    if hours == 1:
                        duration_str = "1"
                    elif hours.is_integer():
                        duration_str = f"{int(hours)}"
                    else:
                        duration_str = f"{hours}"
            except Exception:
                duration_str = ""
                
        writer.writerow([start_str, end_str, duration_str, s["person"], s["division"], s["product"], s["title"], s["status"]])

    output.seek(0)
    response = Response(content=output.getvalue(), media_type="text/csv")
    filename = f"Schedules_{site_name_filename}.csv" if site_id else f"schedules_export_{year}_{month:02d}.csv"
    response.headers["Content-Disposition"] = f"attachment; filename={filename}"
    return response

async def delete_schedule(schedule_id: str, current_user: dict):
    schedule = await db.schedules.find_one({"id": schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
        
    if schedule.get("created_by") == current_user["id"]:
        pass 
    else:
        if current_user["role"] not in ["VP", "Manager", "SPV"]:
            raise HTTPException(status_code=403, detail="Only VP, Managers, and SPV can delete schedules")
        
        if current_user["role"] in ["Manager", "SPV"]:
            user_div_id = await resolve_division_id_from_user(current_user)
            schedule_div_id = schedule.get("division_id")
            if not schedule_div_id:
                div = await db.divisions.find_one({"name": schedule["division"]})
                schedule_div_id = div["id"] if div else None
            
            allowed = await validate_division_hierarchy(user_div_id, schedule_div_id)
            
            is_admin_tech = await is_admin_tech_ops(current_user)
            tech_ops_dept_id = await get_tech_ops_department_id()
            
            if is_admin_tech:
                sched_user = await db.users.find_one({"id": schedule["user_id"]})
                is_tech_ops = False
                if sched_user:
                    is_tech_ops = (tech_ops_dept_id and sched_user.get("department_id") == tech_ops_dept_id)
                if is_tech_ops or schedule["division"] == current_user.get("division"):
                    allowed = True
            
            if not allowed:
                raise HTTPException(status_code=403, detail="You can only delete schedules from your division or its sub-divisions")
                
    result = await db.schedules.delete_one({"id": schedule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Schedule not found")
    return {"message": "Schedule deleted successfully"}

async def update_schedule(schedule_id: str, update_data: ScheduleUpdate, current_user: dict):
    schedule = await db.schedules.find_one({"id": schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
        
    if schedule.get("created_by") == current_user["id"]:
        pass 
    else:
        if current_user["role"] not in ["VP", "Manager", "SPV"]:
            raise HTTPException(status_code=403, detail="Only VP, Managers, and SPV can edit schedules")
        
        if current_user["role"] in ["Manager", "SPV"]:
            user_div_id = await resolve_division_id_from_user(current_user)
            schedule_div_id = schedule.get("division_id")
            if not schedule_div_id:
                div = await db.divisions.find_one({"name": schedule["division"]})
                schedule_div_id = div["id"] if div else None
            
            allowed = await validate_division_hierarchy(user_div_id, schedule_div_id)
            
            is_admin_tech = await is_admin_tech_ops(current_user)
            tech_ops_dept_id = await get_tech_ops_department_id()
            
            if is_admin_tech:
                sched_user = await db.users.find_one({"id": schedule["user_id"]})
                is_tech_ops = False
                if sched_user:
                    is_tech_ops = (tech_ops_dept_id and sched_user.get("department_id") == tech_ops_dept_id) or (sched_user.get("department") == "Technical Operation")
                if is_tech_ops or schedule["division"] == current_user.get("division"):
                    allowed = True

            if not allowed:
                raise HTTPException(status_code=403, detail="You can only edit schedules from your division or its sub-divisions")
                
    update_dict: dict[str, Any] = {}
    if update_data.user_id:
        update_dict["user_id"] = update_data.user_id
        target_user = await db.users.find_one({"id": update_data.user_id}, {"_id": 0})
        if not target_user:
             raise HTTPException(status_code=404, detail="New assignee not found")
        
        if current_user["role"] in ["Manager", "SPV"] and current_user["id"] != schedule.get("created_by"):
            user_div_id = await resolve_division_id_from_user(current_user)
            target_div_id = await resolve_division_id_from_user(target_user)
            div_allowed = await validate_division_hierarchy(user_div_id, target_div_id)
            if not div_allowed:
                raise HTTPException(status_code=403, detail=f"No permission to assign to user in {target_user.get('division', 'Unknown')} division")
            
            current_region = current_user.get("region")
            target_region = target_user.get("region")
            if current_region and target_region and current_region != target_region:
                raise HTTPException(status_code=403, detail=f"No permission to assign to user in different region ({target_region})")

        update_dict["user_name"] = target_user["username"]
        update_dict["division"] = target_user.get("division", "")
    elif update_data.user_name: 
        update_dict["user_name"] = update_data.user_name

    if update_data.title:
        update_dict["title"] = update_data.title
    if update_data.description is not None:
        update_dict["description"] = update_data.description
    if update_data.product is not None:
        update_dict["product"] = update_data.product
    
    if update_data.category_id is not None:
        update_dict["category_id"] = update_data.category_id
        if update_data.category_id:
            category = await db.activity_categories.find_one({"id": update_data.category_id}, {"_id": 0})
            if category:
                update_dict["category_name"] = category["name"]
        else:
            update_dict["category_name"] = None

    if update_data.start_date:
        update_dict["start_date"] = datetime.fromisoformat(update_data.start_date).isoformat()
    if update_data.end_date:
        update_dict["end_date"] = datetime.fromisoformat(update_data.end_date).isoformat()
    if update_data.site_id is not None:
        update_dict["site_id"] = update_data.site_id
        if update_data.site_id:
            site = await db.sites.find_one({"id": update_data.site_id}, {"_id": 0})
            if site:
                update_dict["site_name"] = site["name"]
                update_dict["site_region"] = site.get("region") 
        else:
            update_dict["site_name"] = None
            update_dict["site_region"] = None
            
    if update_dict:
        await db.schedules.update_one(
            {"id": schedule_id},
            {"$set": update_dict}
        )
        
        updated_sched = await db.schedules.find_one({"id": schedule_id}, {"_id": 0})
        if updated_sched:
            await create_notification(
                user_id=updated_sched["user_id"],
                title="Schedule Edited",
                message=f"Jadwal Anda '{updated_sched['title']}' telah diperbarui oleh {current_user['username']}.",
                notification_type="schedule_edit",
                related_id=schedule_id
            )
            
    if schedule.get("division") == "Monitoring" or (update_data.user_id and (await db.users.find_one({"id": update_data.user_id})).get("division") == "Monitoring"):
        updated_schedule = await db.schedules.find_one({"id": schedule_id}, {"_id": 0})
        cat_name = updated_schedule.get("category_name") or updated_schedule.get("title")
        if cat_name not in MONITORING_SHIFTS:
             pass 
    return {"message": "Schedule updated successfully"}

async def create_shift_change_request(request_data: ShiftChangeRequestCreate, current_user: dict):
    schedule = await db.schedules.find_one({"id": request_data.schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    if schedule["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only request changes to your own schedules")
        
    request = ShiftChangeRequest(
        schedule_id=request_data.schedule_id,
        requested_by=current_user["id"],
        requested_by_name=current_user["username"],
        reason=request_data.reason,
        new_start_date=datetime.fromisoformat(request_data.new_start_date),
        new_end_date=datetime.fromisoformat(request_data.new_end_date)
    )
    doc = request.model_dump()
    doc['new_start_date'] = doc['new_start_date'].isoformat()
    doc['new_end_date'] = doc['new_end_date'].isoformat()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.shift_change_requests.insert_one(doc)
    
    manager = await db.users.find_one({"role": "Manager", "division": schedule["division"]}, {"_id": 0})
    if manager:
        await create_notification(
            user_id=manager["id"],
            title="Shift Change Request",
            message=f"{current_user['username']} requested a shift change",
            notification_type="shift_change",
            related_id=request.id
        )
    return {"message": "Shift change request submitted", "id": request.id}

async def fetch_shift_change_requests(current_user: dict):
    if current_user["role"] in ["Manager", "VP"]:
        query = {"status": "pending"}
        if current_user["role"] == "Manager":
            schedules = await db.schedules.find({"division": current_user.get("division")}, {"_id": 0}).to_list(10000)
            schedule_ids = [s["id"] for s in schedules]
            query["schedule_id"] = {"$in": schedule_ids}
        requests = await db.shift_change_requests.find(query, {"_id": 0}).to_list(1000)
    else:
        requests = await db.shift_change_requests.find({"requested_by": current_user["id"]}, {"_id": 0}).to_list(1000)
    return requests

async def review_shift_change_request(action_data: ShiftChangeReviewAction, current_user: dict):
    if current_user["role"] not in ["Manager", "VP"]:
        raise HTTPException(status_code=403, detail="Only managers can review shift change requests")
    request = await db.shift_change_requests.find_one({"id": action_data.request_id}, {"_id": 0})
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
        
    schedule = await db.schedules.find_one({"id": request["schedule_id"]}, {"_id": 0})
    
    user_div_id = await resolve_division_id_from_user(current_user)
    schedule_div_id = schedule.get("division_id")
    if not schedule_div_id:
        div = await db.divisions.find_one({"name": schedule["division"]})
        schedule_div_id = div["id"] if div else None
    
    allowed = await validate_division_hierarchy(user_div_id, schedule_div_id)
    if current_user["role"] == "Manager" and not allowed:
        raise HTTPException(status_code=403, detail="Can only review requests from your division or its sub-divisions")
        
    new_status = "approved" if action_data.action == "approve" else "rejected"
    await db.shift_change_requests.update_one(
        {"id": action_data.request_id},
        {
            "$set": {
                "status": new_status,
                "reviewed_by": current_user["id"],
                "review_comment": action_data.comment,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    
    if action_data.action == "approve":
        await db.schedules.update_one(
            {"id": request["schedule_id"]},
            {
                "$set": {
                    "start_date": request["new_start_date"],
                    "end_date": request["new_end_date"]
                }
            }
        )
        
    await create_notification(
        user_id=request["requested_by"],
        title=f"Shift Change Request {new_status.capitalize()}",
        message=f"Your shift change request has been {new_status}",
        notification_type="shift_change",
        related_id=action_data.request_id
    )
    return {"message": f"Request {new_status}"}
