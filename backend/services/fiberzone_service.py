import csv
import io
from datetime import datetime, timezone, timedelta
from typing import Optional
from fastapi import HTTPException, Response

from database import db
from utils import create_notification
from models import FiberzoneSchedule, FiberzoneScheduleCreate, FiberzoneScheduleUpdate

async def get_fiberzone_dashboard():
    active_wo_count = await db.work_orders.count_documents({
        "status": {"$in": ["Created", "On Progress", "Teknis Stage"]}
    })
    
    total_fiberzone_clients = await db.sites.count_documents({
        "fiberzone": True
    })
    
    active_wo_list = await db.work_orders.find(
        {"status": {"$in": ["Created", "On Progress", "Teknis Stage"]}},
        {"_id": 0}
    ).sort("created_at", -1).to_list(10)
    
    LOCAL_TZ = timezone(timedelta(hours=8))
    now = datetime.now(LOCAL_TZ)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)

    today_schedules = await db.fiberzone_schedules.find(
        {
            "start_time": {"$lte": today_end.isoformat()},
            "end_time": {"$gte": today_start.isoformat()}
        },
        {"_id": 0}
    ).sort("start_time", 1).to_list(10)

    dash_creator_ids = list(set(s.get("created_by") for s in today_schedules if s.get("created_by")))
    if dash_creator_ids:
        dash_creators = await db.users.find({"id": {"$in": dash_creator_ids}}, {"_id": 0, "id": 1, "username": 1}).to_list(None)
        dash_creator_map = {c["id"]: c["username"] for c in dash_creators}
        for s in today_schedules:
            s["created_by_name"] = dash_creator_map.get(s.get("created_by"), "")

    today_schedule_count = await db.fiberzone_schedules.count_documents({
        "start_time": {"$lte": today_end.isoformat()},
        "end_time": {"$gte": today_start.isoformat()}
    })

    return {
        "active_wo_count": active_wo_count,
        "total_fiberzone_clients": total_fiberzone_clients,
        "active_wo_list": active_wo_list,
        "today_schedules": today_schedules,
        "today_schedule_count": today_schedule_count
    }

async def create_fiberzone_schedule(data: FiberzoneScheduleCreate, current_user: dict):
    if current_user["role"] not in ["VP", "Manager", "SPV", "SuperUser"]:
        raise HTTPException(status_code=403, detail="Only VP, Managers, and SPV can create schedules")

    site = await db.sites.find_one({"id": data.site_id}, {"_id": 0})
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    if not site.get("fiberzone"):
        raise HTTPException(status_code=400, detail="Selected site is not a Fiberzone-flagged site")

    start_dt = datetime.fromisoformat(data.start_time)
    end_dt = datetime.fromisoformat(data.end_time)

    if end_dt <= start_dt:
        raise HTTPException(status_code=400, detail="End time must be after start time")

    created_ids = []
    for user_id in data.user_ids:
        user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not user:
            continue

        user_division = user.get("division", "")
        if user_division not in ["Fiberzone", "Enterprise Solution"]:
            raise HTTPException(
                status_code=400,
                detail=f"User {user['username']} is not from Fiberzone division"
            )

        schedule = FiberzoneSchedule(
            user_id=user["id"],
            user_name=user["username"],
            site_id=data.site_id,
            site_name=site.get("name", ""),
            title=data.title,
            start_time=start_dt,
            end_time=end_dt,
            created_by=current_user["id"]
        )

        doc = schedule.model_dump()
        doc["start_time"] = doc["start_time"].isoformat()
        doc["end_time"] = doc["end_time"].isoformat()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.fiberzone_schedules.insert_one(doc)
        created_ids.append(schedule.id)

        await create_notification(
            user_id=user["id"],
            title="📋 Jadwal Fiberzone Baru",
            message=f"Kamu dijadwalkan untuk: {schedule.title} di {schedule.site_name} ({start_dt.strftime('%Y-%m-%d %H:%M')} s/d {end_dt.strftime('%H:%M')})",
            notification_type="fiberzone_schedule",
            related_id=schedule.id
        )

    return {"message": f"{len(created_ids)} fiberzone schedule(s) created successfully", "ids": created_ids}

async def get_fiberzone_schedules(site_id: Optional[str]):
    query = {}
    if site_id:
        query["site_id"] = site_id
    schedules = await db.fiberzone_schedules.find(query, {"_id": 0}).to_list(10000)

    creator_ids = list(set(s.get("created_by") for s in schedules if s.get("created_by")))
    if creator_ids:
        creators = await db.users.find({"id": {"$in": creator_ids}}, {"_id": 0, "id": 1, "username": 1}).to_list(None)
        creator_map = {c["id"]: c["username"] for c in creators}
        for s in schedules:
            s["created_by_name"] = creator_map.get(s.get("created_by"), "")

    return schedules

async def get_fiberzone_schedules_today():
    LOCAL_TZ = timezone(timedelta(hours=8))
    now = datetime.now(LOCAL_TZ)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = now.replace(hour=23, minute=59, second=59, microsecond=999999)

    schedules = await db.fiberzone_schedules.find(
        {
            "start_time": {"$lte": today_end.isoformat()},
            "end_time": {"$gte": today_start.isoformat()}
        },
        {"_id": 0}
    ).sort("start_time", 1).to_list(100)

    creator_ids = list(set(s.get("created_by") for s in schedules if s.get("created_by")))
    if creator_ids:
        creators = await db.users.find({"id": {"$in": creator_ids}}, {"_id": 0, "id": 1, "username": 1}).to_list(None)
        creator_map = {c["id"]: c["username"] for c in creators}
        for s in schedules:
            s["created_by_name"] = creator_map.get(s.get("created_by"), "")

    return schedules

async def export_fiberzone_schedules(month: int, year: int):
    start_dt = datetime(year, month, 1, tzinfo=timezone.utc)
    if month == 12:
        end_dt = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
    else:
        end_dt = datetime(year, month + 1, 1, tzinfo=timezone.utc)

    query = {
        "start_time": {
            "$gte": start_dt.isoformat(),
            "$lt": end_dt.isoformat()
        }
    }

    schedules = await db.fiberzone_schedules.find(query).sort("start_time", 1).to_list(None)
    
    user_ids = list(set([s.get("user_id") for s in schedules]))
    users_data = await db.users.find({"id": {"$in": user_ids}}, {"id": 1, "division": 1}).to_list(None)
    user_div_map = {u["id"]: u.get("division", "") for u in users_data}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Start Date", "End Date", "Person", "Division", "Category", "Product", "Title", "Site"])

    for s in schedules:
        start_str = datetime.fromisoformat(s.get("start_time")).strftime("%Y-%m-%d %H:%M") if s.get("start_time") else ""
        end_str = datetime.fromisoformat(s.get("end_time")).strftime("%Y-%m-%d %H:%M") if s.get("end_time") else ""
        person = s.get("user_name", "")
        division = user_div_map.get(s.get("user_id"), "Fiberzone")
        category = ""
        product = s.get("product", "Fiberzone")
        title = s.get("title", "")
        site = s.get("site_name", "")
        writer.writerow([start_str, end_str, person, division, category, product, title, site])

    output.seek(0)
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = f"attachment; filename=fiberzone_schedules_export_{year}_{month:02d}.csv"
    return response

async def update_fiberzone_schedule(schedule_id: str, data: FiberzoneScheduleUpdate, current_user: dict):
    schedule = await db.fiberzone_schedules.find_one({"id": schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="Fiberzone schedule not found")

    if schedule.get("created_by") != current_user["id"]:
        if current_user["role"] not in ["VP", "Manager", "SPV", "SuperUser"]:
            raise HTTPException(status_code=403, detail="No permission to edit this schedule")

    update_dict = {}

    if data.user_id is not None:
        user = await db.users.find_one({"id": data.user_id}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        user_division = user.get("division", "")
        if user_division not in ["Fiberzone", "Enterprise Solution"]:
            raise HTTPException(status_code=400, detail=f"User {user['username']} is not from Fiberzone division")
        update_dict["user_id"] = user["id"]
        update_dict["user_name"] = user["username"]

    if data.site_id is not None:
        site = await db.sites.find_one({"id": data.site_id}, {"_id": 0})
        if not site:
            raise HTTPException(status_code=404, detail="Site not found")
        if not site.get("fiberzone"):
            raise HTTPException(status_code=400, detail="Selected site is not a Fiberzone-flagged site")
        update_dict["site_id"] = site["id"]
        update_dict["site_name"] = site.get("name", "")

    if data.title is not None:
        update_dict["title"] = data.title

    if data.start_time is not None:
        update_dict["start_time"] = datetime.fromisoformat(data.start_time).isoformat()
        update_dict["notified_1h_before"] = False

    if data.end_time is not None:
        update_dict["end_time"] = datetime.fromisoformat(data.end_time).isoformat()
        update_dict["auto_finished"] = False
        update_dict["status"] = "Scheduled"

    if data.product is not None:
        update_dict["product"] = data.product

    if update_dict:
        await db.fiberzone_schedules.update_one(
            {"id": schedule_id},
            {"$set": update_dict}
        )

        updated_sched = await db.fiberzone_schedules.find_one({"id": schedule_id}, {"_id": 0})
        if updated_sched:
            await create_notification(
                user_id=updated_sched["user_id"],
                title="Jadwal Fiberzone Diedit",
                message=f"Jadwal Fiberzone Anda '{updated_sched['title']}' telah diperbarui oleh {current_user['username']}.",
                notification_type="fiberzone_schedule_edit",
                related_id=schedule_id
            )

    return {"message": "Fiberzone schedule updated successfully"}

async def delete_fiberzone_schedule(schedule_id: str, current_user: dict):
    schedule = await db.fiberzone_schedules.find_one({"id": schedule_id}, {"_id": 0})
    if not schedule:
        raise HTTPException(status_code=404, detail="Fiberzone schedule not found")

    if schedule.get("created_by") != current_user["id"]:
        if current_user["role"] not in ["VP", "Manager", "SPV", "SuperUser"]:
            raise HTTPException(status_code=403, detail="No permission to delete this schedule")

    result = await db.fiberzone_schedules.delete_one({"id": schedule_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fiberzone schedule not found")

    return {"message": "Fiberzone schedule deleted successfully"}

async def get_fiberzone_users():
    users = await db.users.find(
        {"division": {"$in": ["Fiberzone", "Enterprise Solution"]}, "account_status": "approved"},
        {"_id": 0, "password_hash": 0}
    ).to_list(500)
    return users

async def get_fiberzone_sites():
    sites = await db.sites.find(
        {"fiberzone": True},
        {"_id": 0}
    ).to_list(5000)
    return sites
