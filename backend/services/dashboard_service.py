from datetime import datetime, timezone, timedelta
from typing import List, Optional, Any, Dict

from database import db
from services.report_service import check_report_auth_meta

async def get_dashboard(current_user: dict):
    today = datetime.now(timezone.utc)
    schedules_today = await db.schedules.find(
        {"user_id": current_user["id"]},
        {"_id": 0}
    ).to_list(100)
    schedules_today = [
        s for s in schedules_today 
        if datetime.fromisoformat(s["start_date"]).date() <= today.date() <= datetime.fromisoformat(s["end_date"]).date()
    ]

    start_of_week = today - timedelta(days=today.weekday())
    weekly_counts = []
    
    end_of_week = start_of_week + timedelta(days=6)
    all_weekly_schedules = await db.schedules.find({
        "start_date": {"$lte": end_of_week.isoformat()},
        "end_date": {"$gte": start_of_week.isoformat()}
    }, {"_id": 0, "user_id": 1, "start_date": 1, "end_date": 1}).to_list(10000)

    unique_persons_today = set()
    
    for i in range(7):
        day = start_of_week + timedelta(days=i)
        day_date = day.date()
        unique_users_day = set()
        
        for s in all_weekly_schedules:
            try:
                s_start = datetime.fromisoformat(s["start_date"]).date()
                s_end = datetime.fromisoformat(s["end_date"]).date() if s.get("end_date") else s_start
                if s_start <= day_date <= s_end:
                    unique_users_day.add(s["user_id"])
                    if day_date == today.date():
                        unique_persons_today.add(s["user_id"])
            except Exception:
                continue
        
        weekly_counts.append({
            "day": day.strftime("%a")[0],
            "date": day.day,
            "count": len(unique_users_day),
            "is_today": day_date == today.date()
        })
    
    total_persons_today_count = len(unique_persons_today)
    pending_approvals = []
    
    if current_user["role"] == "SPV":
        pending_approvals = await db.reports.find(
            {
                "current_approver": current_user["id"],
                "status": "Pending SPV"
            },
            {"_id": 0, "file_data": 0}
        ).to_list(100)
        
    elif current_user["role"] == "Manager":
        user_division = current_user.get("division")
        division_filter = [user_division]
        if user_division == "TS":
            division_filter.append("Apps")
        elif user_division == "Infra":
            division_filter.append("Fiberzone")
            
        pipeline = [
            {"$match": {"status": "Pending Manager"}},
            {"$lookup": {
                "from": "users",
                "localField": "submitted_by",
                "foreignField": "id",
                "as": "submitter_info"
            }},
            {"$unwind": "$submitter_info"},
            {"$addFields": {
                "effective_region": {
                    "$ifNull": ["$site_region", "$submitter_info.region"]
                },
                "submitter_division": "$submitter_info.division"
            }},
            {"$match": {
                "submitter_division": {"$in": division_filter}
            }}
        ]
        
        if current_user.get("region"):
             pipeline.append({
                  "$match": {"effective_region": current_user.get("region")}
             })
             
        pipeline.append({
            "$project": {
                "_id": 0,
                "file_data": 0,
                "submitter_info": 0,
                "effective_region": 0,
                "submitter_division": 0
            }
        })
        pending_approvals = await db.reports.aggregate(pipeline).to_list(100)
        
    elif current_user["role"] == "VP":
        vp_dept = current_user.get("department")
        if not vp_dept and current_user.get("division") in ["Monitoring", "Infra", "TS", "Apps", "Fiberzone", "Admin", "Internal Support"]:
            vp_dept = "Technical Operation"
            
        query = {"status": "Pending VP"}
        if vp_dept:
            query["department"] = vp_dept
        else:
            query["department"] = "__NONE__"
            
        pending_approvals = await db.reports.find(
            query,
            {"_id": 0, "file_data": 0}
        ).to_list(100)
        
    query = {"status": {"$ne": "Closed"}}
    open_tickets = await db.tickets.find(query, {"_id": 0}).to_list(100000)
    
    pending_accounts = []
    pending_shift_changes = []
    
    if current_user["role"] in ["Manager", "VP"]:
        query = {"account_status": "pending"}
        if current_user["role"] == "Manager":
            query["division"] = current_user.get("division")
            query["role"] = {"$ne": "Manager"}
        elif current_user["role"] == "VP":
            query["role"] = "Manager"
            vp_dept = current_user.get("department")
            if not vp_dept and current_user.get("division") in ["Monitoring", "Infra", "TS", "Apps", "Fiberzone", "Admin", "Internal Support"]:
                vp_dept = "Technical Operation"
            if vp_dept:
                query["department"] = vp_dept
            else:
                query["department"] = "__NONE__"
                
        pending_accounts = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(100)
        
        query = {"status": "pending"}
        if current_user["role"] == "Manager":
            schedules = await db.schedules.find({"division": current_user.get("division")}, {"_id": 0}).to_list(10000)
            schedule_ids = [s["id"] for s in schedules]
            query["schedule_id"] = {"$in": schedule_ids}
        pending_shift_changes = await db.shift_change_requests.find(query, {"_id": 0}).to_list(100)
        
    expiring_starlinks = []
    now = datetime.now(timezone.utc)
    three_days_from_now = now + timedelta(days=3)
    starlinks_cursor = db.starlinks.find({
        "expiration_date": {
            "$lte": three_days_from_now.isoformat()
        }
    }, {"_id": 0})
    expiring_starlinks = await starlinks_cursor.to_list(length=100)
    
    for report in pending_approvals:
        auth_meta = await check_report_auth_meta(report, current_user)
        report["can_approve"] = auth_meta["can_approve"]
        report["can_cancel_approval"] = auth_meta["can_cancel_approval"]
        
    return {
        "schedules_today": schedules_today,
        "pending_approvals": pending_approvals,
        "open_tickets": open_tickets,
        "pending_accounts": pending_accounts,
        "pending_shift_changes": pending_shift_changes,
        "expiring_starlinks": expiring_starlinks,
        "weekly_counts": weekly_counts,
        "global_persons_today_count": total_persons_today_count
    }
