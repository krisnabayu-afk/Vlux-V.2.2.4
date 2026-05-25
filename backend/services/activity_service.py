from datetime import datetime, timezone
from typing import List, Optional, Any, Dict
import os
import shutil
import uuid
import csv
import io
import calendar
from fastapi import HTTPException, status, UploadFile, Response

from database import db, UPLOAD_DIR
from models import ActivityCreate, Activity, AutoPushUpdateQuery
from utils import create_notification, resolve_division_id_from_user, validate_division_hierarchy

async def fetch_todays_schedules(current_user: dict):
    """Get today's schedules for the logged-in user (primarily for Staff)"""
    # Get today's date range (start and end of day)
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = datetime.now(timezone.utc).replace(hour=23, minute=59, second=59, microsecond=999999)
    # Query schedules for current user where start_date is today
    schedules = await db.schedules.find({
        "user_id": current_user["id"],
        "start_date": {
            "$gte": today_start.isoformat(),
            "$lte": today_end.isoformat()
        }
    }, {"_id": 0}).to_list(1000)
    # For each schedule, get the latest activity status if exists
    for schedule in schedules:
        # Fetch ALL activities for this schedule to aggregate progress updates
        all_activities = await db.activities.find(
            {"schedule_id": schedule["id"]},
            {"_id": 0}
        ).sort("created_at", 1).to_list(length=None)
        all_progress_updates = []
        latest_activity = None
        if all_activities:
            latest_activity = all_activities[-1] # Last one is latest due to sort
            for act in all_activities:
                if "progress_updates" in act and act["progress_updates"]:
                    all_progress_updates.extend(act["progress_updates"])
            # Sort updates by timestamp
            all_progress_updates.sort(key=lambda x: x["timestamp"])
        schedule["activity_status"] = latest_activity["status"] if latest_activity else "Pending"
        schedule["latest_activity"] = latest_activity
        schedule["all_progress_updates"] = all_progress_updates
    return schedules

async def record_activity(activity_data: ActivityCreate, current_user: dict):
    """Record an activity action for a schedule"""
    # Get the schedule
    schedule = await db.schedules.find_one({"id": activity_data.schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="Schedule not found")
    # Verify schedule belongs to current user
    if schedule["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only create activities for your own schedules")
    # Validate action_type
    valid_actions = ["start", "finish", "cancel", "hold", "restore"]
    if activity_data.action_type not in valid_actions:
        raise HTTPException(status_code=400, detail=f"Invalid action_type. Must be one of: {', '.join(valid_actions)}")
    # Validate cancel requires reason
    if activity_data.action_type == "cancel" and not activity_data.reason:
        raise HTTPException(status_code=400, detail="Reason is required when cancelling an activity")
    # Map action_type to status
    status_mapping = {
        "start": "In Progress",
        "finish": "Finished",
        "cancel": "Cancelled",
        "hold": "On Hold",
        "restore": "Pending"
    }
    activity = Activity(
        schedule_id=activity_data.schedule_id,
        user_id=current_user["id"],
        user_name=current_user["username"],
        division=schedule["division"],
        action_type=activity_data.action_type,
        status=status_mapping[activity_data.action_type],
        notes=activity_data.notes,
        reason=activity_data.reason,
        latitude=activity_data.latitude,
        longitude=activity_data.longitude
    )
    doc = activity.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.activities.insert_one(doc)
    # Special logic for Hold status - notify Manager
    if activity_data.action_type == "hold":
        manager = await db.users.find_one({"role": "Manager", "division": schedule["division"]}, {"_id": 0})
        if manager:
            await create_notification(
                user_id=manager["id"],
                title="Task On Hold",
                message=f"{current_user['username']} has put task '{schedule['title']}' on hold",
                notification_type="activity",
                related_id=activity.id
            )
    return {"message": f"Activity recorded successfully", "id": activity.id, "status": activity.status}

async def fetch_activities(current_user: dict):
    """Get activity history - Staff see only their own, Managers/VP see division/all"""
    query = {}
    if current_user["role"] == "Staff":
        # Staff only see their own activities
        query["user_id"] = current_user["id"]
    elif current_user["role"] in ["Manager", "SPV"]:
        # Managers and SPV see activities from their division
        query["division"] = current_user.get("division")
    # VP sees all activities (no filter)
    activities = await db.activities.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return activities

async def append_progress_update(
    activity_id: str,
    update_text: str,
    latitude: Optional[float],
    longitude: Optional[float],
    file: Optional[UploadFile],
    current_user: dict
):
    """Add a timestamped progress update to an activity"""
    # Get the activity
    activity = await db.activities.find_one({"id": activity_id}, {"_id": 0})
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    # Verify activity belongs to current user
    if activity["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only add updates to your own activities")
    image_url = None
    if file:
        # Generate unique filename
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        file_extension = os.path.splitext(file.filename)[1]
        unique_filename = f"{timestamp}_{uuid.uuid4().hex[:8]}{file_extension}"
        # Create activity-specific folder
        activity_dir = UPLOAD_DIR / "activities" / activity_id
        activity_dir.mkdir(parents=True, exist_ok=True)
        file_path = activity_dir / unique_filename
        # Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        # Set URL
        image_url = f"/uploads/activities/{activity_id}/{unique_filename}"
    # Create the progress update with timestamp
    progress_update = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "update_text": update_text,
        "user_name": current_user["username"],
        "image_url": image_url,
        "latitude": latitude,
        "longitude": longitude
    }
    # Add to the activity's progress_updates array
    await db.activities.update_one(
        {"id": activity_id},
        {
            "$push": {"progress_updates": progress_update},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    return {"message": "Progress update added successfully"}

async def append_auto_progress_update(data: AutoPushUpdateQuery, current_user: dict):
    """Add an automated periodic progress update with location"""
    # Get the activity
    activity = await db.activities.find_one({"id": data.activity_id}, {"_id": 0})
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found")
    # Verify activity belongs to current user
    if activity["user_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="You can only add updates to your own activities")
    # Verify activity is currently In Progress
    if activity["status"] != "In Progress":
        raise HTTPException(status_code=400, detail="Activity is not in progress")
    update_text = "Sedang proses pengerjaan"
    if data.latitude is None or data.longitude is None:
        update_text += " (Location Access Denied)"
    # Create the progress update with timestamp
    progress_update = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "update_text": update_text,
        "user_name": current_user["username"],
        "latitude": data.latitude,
        "longitude": data.longitude,
        "is_auto": True
    }
    # Add to the activity's progress_updates array
    await db.activities.update_one(
        {"id": data.activity_id},
        {
            "$push": {"progress_updates": progress_update},
            "$set": {"updated_at": datetime.now(timezone.utc).isoformat()}
        }
    )
    return {"message": "Auto update added successfully"}

async def fetch_schedule_activity(schedule_id: str):
    # Public endpoint for authenticated users to see activity details
    # Fetch ALL activities to aggregate updates
    all_activities = await db.activities.find(
        {"schedule_id": schedule_id},
        {"_id": 0}
    ).sort("created_at", 1).to_list(length=None)
    if not all_activities:
        return None
    latest_activity = all_activities[-1]
    all_progress_updates = []
    start_time = None
    start_lat = None
    start_lng = None
    finish_time = None
    finish_lat = None
    finish_lng = None
    for act in all_activities:
        # Extract specific times and locations
        if act["action_type"] == "start" and not start_time:
            start_time = act["created_at"]
            start_lat = act.get("latitude")
            start_lng = act.get("longitude")
        if act["action_type"] == "finish":
            finish_time = act["created_at"]
            finish_lat = act.get("latitude")
            finish_lng = act.get("longitude")
        # Incorporate notes/reasons as virtual progress updates
        if act.get("notes"):
            all_progress_updates.append({
                "timestamp": act["created_at"],
                "update_text": f"Note ({act['action_type'].capitalize()}): {act['notes']}",
                "user_name": act["user_name"],
                "latitude": act.get("latitude"),
                "longitude": act.get("longitude"),
                "is_system": True
            })
        if act.get("reason"):
            all_progress_updates.append({
                "timestamp": act["created_at"],
                "update_text": f"Cancellation Reason: {act['reason']}",
                "user_name": act["user_name"],
                "latitude": act.get("latitude"),
                "longitude": act.get("longitude"),
                "is_system": True
            })
        # Regular progress updates
        if "progress_updates" in act and act["progress_updates"]:
            all_progress_updates.extend(act["progress_updates"])
    all_progress_updates.sort(key=lambda x: x["timestamp"])
    # Prepare response based on latest activity but with ALL updates
    response = latest_activity.copy()
    response["progress_updates"] = all_progress_updates # Override with aggregated list
    response["start_time"] = start_time
    response["start_lat"] = start_lat
    response["start_lng"] = start_lng
    response["finish_time"] = finish_time
    response["finish_lat"] = finish_lat
    response["finish_lng"] = finish_lng
    return response

async def generate_activities_csv(user_id: str, month: str, current_user: dict):
    """
    Export CSV containing all progress updates of a selected user and month.
    Authorized for Manager, VP, and SuperUser roles only.
    Managers are restricted to their division hierarchy.
    """
    if current_user["role"] not in ["Manager", "VP", "SuperUser"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only Manager, VP, or SuperUser can export activities"
        )
    
    # User validation
    target_user = await db.users.find_one({"id": user_id})
    if not target_user:
        raise HTTPException(status_code=404, detail="Target user not found")
        
    # Division hierarchy constraint for Managers
    if current_user["role"] == "Manager":
        manager_div_id = await resolve_division_id_from_user(current_user)
        user_div_id = await resolve_division_id_from_user(target_user)
        
        # Check division hierarchy
        is_allowed = False
        if manager_div_id and user_div_id:
            is_allowed = await validate_division_hierarchy(manager_div_id, user_div_id)
        else:
            # Fallback to legacy division string match
            is_allowed = current_user.get("division") == target_user.get("division")
            
        if not is_allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only export activities of users in your division hierarchy"
            )

    # Date range parsing
    try:
        year, month_num = map(int, month.split("-"))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid month format. Expected YYYY-MM")
        
    month_start = datetime(year, month_num, 1, 0, 0, 0, tzinfo=timezone.utc)
    last_day = calendar.monthrange(year, month_num)[1]
    month_end = datetime(year, month_num, last_day, 23, 59, 59, 999999, tzinfo=timezone.utc)
    
    # Query all activities of target user in the selected month range
    activities = await db.activities.find({
        "user_id": user_id,
        "created_at": {
            "$gte": month_start.isoformat(),
            "$lte": month_end.isoformat()
        }
    }).sort("created_at", 1).to_list(length=None)
    
    # Fetch schedules associated with these activities to resolve site names
    schedule_ids = list(set([act["schedule_id"] for act in activities]))
    schedules = await db.schedules.find({"id": {"$in": schedule_ids}}).to_list(length=None)
    schedule_map = {sched["id"]: sched for sched in schedules}
    
    # Aggregate progress rows
    rows = []
    
    def format_timestamp(ts_str):
        if not ts_str:
            return ""
        try:
            dt = datetime.fromisoformat(ts_str.replace("Z", "+00:00"))
            return dt.strftime("%Y-%m-%d %H:%M:%S")
        except Exception:
            return ts_str
            
    for act in activities:
        sched = schedule_map.get(act["schedule_id"], {})
        site_name = sched.get("site_name", "N/A")
        
        # 1. Main activity status update
        status_text = act.get("status", "")
        main_text = f"Activity Status: {status_text}"
        if act.get("notes"):
            main_text += f" - Note: {act['notes']}"
        if act.get("reason"):
            main_text += f" - Reason: {act['reason']}"
            
        maps_link = ""
        if act.get("latitude") is not None and act.get("longitude") is not None:
            maps_link = f"https://www.google.com/maps?q={act.get('latitude')},{act.get('longitude')}"
            
        rows.append({
            "time_stamp": act.get("created_at"),
            "site_name": site_name,
            "progress_update": main_text,
            "maps_link": maps_link
        })
        
        # 2. Regular progress updates inside act["progress_updates"]
        for p_update in act.get("progress_updates", []):
            lat = p_update.get("latitude")
            lng = p_update.get("longitude")
            maps_link = f"https://www.google.com/maps?q={lat},{lng}" if lat is not None and lng is not None else ""
            rows.append({
                "time_stamp": p_update.get("timestamp"),
                "site_name": site_name,
                "progress_update": p_update.get("update_text", ""),
                "maps_link": maps_link
            })
            
    # Sort all entries chronologically by time_stamp
    rows.sort(key=lambda x: x["time_stamp"] or "")
    
    # Generate CSV content
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write header
    writer.writerow(["time_stamp", "site_name", "progress_update", "maps_link"])
    
    # Write rows
    for row in rows:
        writer.writerow([
            format_timestamp(row["time_stamp"]),
            row["site_name"],
            row["progress_update"],
            row["maps_link"]
        ])
        
    csv_data = output.getvalue()
    output.close()
    
    username = target_user.get("username", "user")
    filename = f"activities_{username}_{month}.csv"
    
    return Response(
        content=csv_data,
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={filename}"
        }
    )
