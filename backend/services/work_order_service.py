from fastapi import HTTPException
from typing import Optional
from datetime import datetime, timezone
import uuid
import asyncio

from database import db
from utils import send_telegram_message
from models import WorkOrder, WorkOrderCreate, WorkOrderUpdate, WorkOrderComment

async def create_work_order(wo_data: WorkOrderCreate, current_user: dict):
    # Validate Site and get Name and Location
    site_name = ""
    site_location = "N/A"
    site = await db.sites.find_one({"id": wo_data.site_id}, {"_id": 0})
    if site:
        site_name = site["name"]
        site_location = site.get("location", "N/A")
        
    wo = WorkOrder(
        **wo_data.model_dump(),
        site_name=site_name,
        status="Created",
        created_by=current_user["id"],
        created_by_name=current_user["username"]
    )
    
    doc = wo.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.work_orders.insert_one(doc)

    # --- TELEGRAM NOTIFICATION ---
    settings = await db.settings.find_one({"id": "site_settings"})
    if settings and settings.get("fiberzone_notification_chat_id"):
        chat_id = settings["fiberzone_notification_chat_id"]
        frontend_url = settings.get("frontend_url", "https://vlux.varnion.net.id:3002")
        
        doc_link = f"{frontend_url}/sites/{wo_data.site_id}"
        activities_str = ", ".join(wo_data.activity) if wo_data.activity else "N/A"
        notes_str = wo_data.notes if wo_data.notes else "-"

        message = (
            f"*{wo_data.ticket_number}*\n"
            f"*{site_name}*\n"
            f"*{site_location}*\n"
            f"*{notes_str}*\n\n"
            f"*{wo_data.package}*\n"
            f"*{activities_str}*\n\n"
            f"SN ONT: *{wo_data.sn_ont}*\n"
            f"Userame: *{wo_data.username_wo}*\n"
            f"Password: *{wo_data.password_wo}*\n\n"
            f"GPON *{wo_data.gpon}*\n"
            f"Link Detail Klien: *{doc_link}*"
        )
        asyncio.create_task(send_telegram_message(chat_id, message))

    return {"message": "Work Order created successfully", "id": wo.id}

async def fetch_work_orders(
    page: int,
    limit: int,
    status: Optional[str],
    site_id: Optional[str],
    search: Optional[str]
):
    pipeline = []
    match_stage = {}
    
    if status and status != 'all':
        match_stage["status"] = status
    if site_id and site_id != 'all':
        match_stage["site_id"] = site_id
        
    if search:
        match_stage["$or"] = [
            {"ticket_number": {"$regex": search, "$options": "i"}},
            {"site_name": {"$regex": search, "$options": "i"}},
            {"username_wo": {"$regex": search, "$options": "i"}}
        ]
        
    if match_stage:
        pipeline.append({"$match": match_stage})
        
    pipeline.append({"$project": {"_id": 0}})
    
    pipeline.append({
        "$addFields": {
            "sort_priority": {
                "$cond": {
                    "if": {"$in": ["$status", ["Done", "Closed"]]},
                    "then": 1,
                    "else": 0
                }
            }
        }
    })
    
    pipeline.append({
        "$sort": {
            "sort_priority": 1,
            "created_at": -1
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
    
    result = await db.work_orders.aggregate(pipeline).to_list(1)
    metadata = result[0]["metadata"]
    data = result[0]["data"]
    total = metadata[0]["total"] if metadata else 0
    total_pages = (total + limit - 1) // limit if limit > 0 else 0
    
    return {
        "items": data,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }

async def fetch_work_order_by_id(wo_id: str):
    wo = await db.work_orders.find_one({"id": wo_id}, {"_id": 0})
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")
    return wo

async def update_work_order(wo_id: str, update_data: WorkOrderUpdate):
    wo = await db.work_orders.find_one({"id": wo_id}, {"_id": 0})
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")
        
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    
    if update_data.site_id:
        site = await db.sites.find_one({"id": update_data.site_id}, {"_id": 0})
        if site:
            update_dict["site_name"] = site["name"]
            
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.work_orders.update_one(
        {"id": wo_id},
        {"$set": update_dict}
    )
    return {"message": "Work Order updated successfully"}

async def delete_work_order(wo_id: str):
    wo = await db.work_orders.find_one({"id": wo_id})
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")
        
    await db.work_orders.delete_one({"id": wo_id})
    return {"message": "Work Order deleted successfully"}

async def add_work_order_comment(wo_id: str, comment_data: WorkOrderComment, current_user: dict):
    comment = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "user_name": current_user["username"],
        "comment": comment_data.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Fetch WO to get ticket number
    wo = await db.work_orders.find_one({"id": wo_id})
    if not wo:
        raise HTTPException(status_code=404, detail="Work Order not found")

    await db.work_orders.update_one(
        {"id": wo_id},
        {"$push": {"comments": comment}}
    )

    # --- TELEGRAM NOTIFICATION ---
    settings = await db.settings.find_one({"id": "site_settings"})
    if settings and settings.get("fiberzone_notification_chat_id"):
        chat_id = settings["fiberzone_notification_chat_id"]
        
        message = (
            f"*{current_user['username']} berkomentar di {wo['ticket_number']} sebagai berikut*\n"
            f"{comment_data.comment}"
        )
        asyncio.create_task(send_telegram_message(chat_id, message))

    return {"message": "Comment added successfully"}
