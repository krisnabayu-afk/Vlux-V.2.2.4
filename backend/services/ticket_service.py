import asyncio
import logging
import uuid
import csv
import io
from datetime import datetime, timezone
from typing import Optional, Any
from fastapi import HTTPException, status, Response

from database import db
from utils import (
    create_notification, send_telegram_message,
    get_manager_for_division, get_manager_by_division_name, get_division_by_name,
    get_concatenated_divisions, is_admin_tech_ops
)
from models import Ticket, TicketCreate, TicketUpdate, TicketComment

async def create_ticket(ticket_data: TicketCreate, current_user: dict):
    site_name = None
    site_region = None
    if ticket_data.site_id:
        site = await db.sites.find_one({"id": ticket_data.site_id}, {"_id": 0})
        if site:
            site_name = site["name"]
            site_region = site.get("region")
            
    ticket = Ticket(
        title=ticket_data.title,
        description=ticket_data.description,
        priority="Medium",
        status="INTERNAL",
        assigned_to_division=ticket_data.assigned_to_division,
        assigned_to_division_id=ticket_data.assigned_to_division_id,
        created_by=current_user["id"],
        created_by_name=current_user["username"],
        site_id=ticket_data.site_id,
        site_name=site_name,
        site_region=site_region if ticket_data.site_id else None,
        ticket_number=ticket_data.ticket_number,
        link=ticket_data.link,
        category=ticket_data.category,
        region=site_region if ticket_data.site_id else None
    )
    
    if ticket.assigned_to_division and not ticket.assigned_to_division_id:
        div = await get_division_by_name(ticket.assigned_to_division)
        if div:
            ticket.assigned_to_division_id = div["id"]
            
    if ticket_data.next_action:
        comment = {
            "id": str(uuid.uuid4()),
            "user_id": current_user["id"],
            "username": current_user["username"],
            "comment": ticket_data.next_action,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        ticket.comments.append(comment)
        ticket.latest_comment = ticket_data.next_action

    doc = ticket.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    await db.tickets.insert_one(doc)

    try:
        manager = None
        if ticket_data.assigned_to_division:
            if ticket.assigned_to_division_id:
                manager = await get_manager_for_division(ticket.assigned_to_division_id)
            if not manager:
                manager = await get_manager_by_division_name(ticket_data.assigned_to_division)
        
        if manager:
            settings = await db.settings.find_one({"id": "site_settings"})
            frontend_url = (settings.get("frontend_url") if settings else None) or "https://vlux.varnion.net.id"
            ticket_link = f"{frontend_url}/tickets/{ticket.id}"

            tg_message = (
                f"Ticket Baru terdispatch ke divisi anda: "
                f"{ticket.title or 'No Title'} - {site_name or 'N/A'} - {ticket.description}. "
                f"Mohon segera ditindak lanjuti. Terima Kasih\n{ticket_link}"
            )

            if manager.get("telegram_id"):
                asyncio.create_task(send_telegram_message(manager["telegram_id"], tg_message))

            await create_notification(
                user_id=manager["id"],
                title="🎫 Ticket Baru untuk Divisi Anda",
                message=f"{ticket.title or 'No Title'} - {site_name or 'N/A'} - {ticket.description}",
                notification_type="ticket_dispatch",
                related_id=ticket.id
            )
    except Exception as e:
        logging.error(f"[TICKET] Failed to send Manager notification for ticket {ticket.id}: {e}")

    return {"message": "Ticket created successfully", "id": ticket.id}


async def fetch_tickets(
    page: int,
    limit: int,
    site_id: Optional[str],
    region: Optional[str],
    category: Optional[str],
    status: Optional[str],
    assigned_to_division: Optional[str],
    exclude_closed: Optional[bool],
    search: Optional[str],
    sort: str
):
    pipeline = []
    match_stage = {}
    
    if site_id and site_id != 'all':
        match_stage["site_id"] = site_id
    if region and region != 'all':
        match_stage["site_region"] = region
    if category and category != 'all':
        match_stage["category"] = category
    if status and status != 'all':
        match_stage["status"] = status
    elif exclude_closed:
        match_stage["status"] = {"$ne": "Closed"}
        
    if assigned_to_division and assigned_to_division != 'all':
        concatenated_ids = await get_concatenated_divisions(assigned_to_division)
        if concatenated_ids:
            match_stage["assigned_to_division"] = {"$in": concatenated_ids}
        else:
            match_stage["assigned_to_division"] = assigned_to_division

    if search:
        match_stage["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"created_by_name": {"$regex": search, "$options": "i"}},
            {"site_name": {"$regex": search, "$options": "i"}},
            {"ticket_number": {"$regex": search, "$options": "i"}}
        ]
        
    if match_stage:
        pipeline.append({"$match": match_stage})
        
    pipeline.append({"$project": {"_id": 0}})
    
    pipeline.append({
        "$addFields": {
            "sort_priority": {
                "$cond": {
                    "if": {"$eq": ["$status", "Closed"]},
                    "then": 1,
                    "else": 0
                }
            },
            "latest_comment": { 
                "$let": {
                    "vars": {
                        "comment_texts": { "$ifNull": ["$comments.comment", []] }
                    },
                    "in": { "$arrayElemAt": ["$$comment_texts", -1] }
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
    
    result = await db.tickets.aggregate(pipeline).to_list(1)
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

async def generate_tickets_csv(
    export_month: Optional[str],
    site_id: Optional[str],
    region: Optional[str],
    category: Optional[str],
    status: Optional[str],
    assigned_to_division: Optional[str],
    exclude_closed: Optional[bool],
    search: Optional[str]
):
    match_stage = {}
    if export_month:
        match_stage["created_at"] = {"$regex": f"^{export_month}"}
    if site_id and site_id != 'all':
        match_stage["site_id"] = site_id
    if region and region != 'all':
        match_stage["site_region"] = region
    if category and category != 'all':
        match_stage["category"] = category
    if status and status != 'all':
        match_stage["status"] = status
    elif exclude_closed:
        match_stage["status"] = {"$ne": "Closed"}
        
    if assigned_to_division and assigned_to_division != 'all':
        concatenated_ids = await get_concatenated_divisions(assigned_to_division)
        if concatenated_ids:
            match_stage["assigned_to_division"] = {"$in": concatenated_ids}
        else:
            match_stage["assigned_to_division"] = assigned_to_division

    if search:
        match_stage["$or"] = [
            {"title": {"$regex": search, "$options": "i"}},
            {"description": {"$regex": search, "$options": "i"}},
            {"created_by_name": {"$regex": search, "$options": "i"}},
            {"site_name": {"$regex": search, "$options": "i"}},
            {"ticket_number": {"$regex": search, "$options": "i"}}
        ]
        
    pipeline = []
    if match_stage:
        pipeline.append({"$match": match_stage})
        
    pipeline.append({
        "$sort": {
            "created_at": -1
        }
    })
    
    tickets = await db.tickets.aggregate(pipeline).to_list(10000)
    
    output = io.StringIO()
    writer = csv.writer(output)
    
    writer.writerow([
        "Ticket Number", 
        "Ticket Name", 
        "Category", 
        "Site", 
        "Regional", 
        "Date Created", 
        "Date Closed", 
        "Status", 
        "Latest Comment"
    ])
    
    for ticket in tickets:
        created_at = ticket.get("created_at", "")
        if created_at:
            try:
                if isinstance(created_at, str):
                    if created_at.endswith('Z'):
                        created_at = created_at[:-1] + '+00:00'
                    dt = datetime.fromisoformat(created_at)
                    created_at = dt.strftime("%Y-%m-%d %H:%M:%S")
                else:
                    created_at = created_at.strftime("%Y-%m-%d %H:%M:%S")
            except:
                pass
                
        date_closed = ""
        if ticket.get("status") == "Closed":
            updated_at = ticket.get("updated_at", "")
            if updated_at:
                try:
                    if isinstance(updated_at, str):
                        if updated_at.endswith('Z'):
                            updated_at = updated_at[:-1] + '+00:00'
                        dt = datetime.fromisoformat(updated_at)
                        date_closed = dt.strftime("%Y-%m-%d %H:%M:%S")
                    else:
                        date_closed = updated_at.strftime("%Y-%m-%d %H:%M:%S")
                except:
                    pass

        comments = ticket.get("comments", [])
        latest_comment = comments[-1]["comment"] if comments else ""
        region_val = ticket.get("region") or ticket.get("site_region") or ""
        
        writer.writerow([
            ticket.get("ticket_number", ""),
            ticket.get("title", ""),
            ticket.get("category", ""),
            ticket.get("site_name", ""),
            region_val,
            created_at,
            date_closed,
            ticket.get("status", ""),
            latest_comment
        ])
        
    filename = "tickets_export.csv"
    if site_id and site_id != 'all':
        site = await db.sites.find_one({"id": site_id})
        if site:
            filename = f"Tickets_{site.get('name', 'Site').replace(' ', '_')}.csv"
        
    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

async def fetch_all_tickets_list():
    tickets = await db.tickets.find({}, {"_id": 0, "id": 1, "title": 1, "created_at": 1}).to_list(1000)
    return tickets

async def fetch_ticket_by_id(ticket_id: str):
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    return ticket

async def update_ticket(ticket_id: str, update_data: TicketUpdate):
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": update_dict}
    )
    return {"message": "Ticket updated successfully"}

async def edit_ticket(ticket_id: str, edit_data: TicketUpdate):
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
        
    update_dict: dict[str, Any] = {}
    if edit_data.title:
        update_dict["title"] = edit_data.title
    if edit_data.description:
        update_dict["description"] = edit_data.description
    if edit_data.assigned_to_division:
        update_dict["assigned_to_division"] = edit_data.assigned_to_division
    if edit_data.ticket_number is not None:
        update_dict["ticket_number"] = edit_data.ticket_number
    if edit_data.link is not None:
        update_dict["link"] = edit_data.link
    if edit_data.category is not None:
        update_dict["category"] = edit_data.category
    if edit_data.site_id is not None:
        update_dict["site_id"] = edit_data.site_id
        if edit_data.site_id:
            site = await db.sites.find_one({"id": edit_data.site_id}, {"_id": 0})
            if site:
                update_dict["site_name"] = site["name"]
                update_dict["site_region"] = site.get("region")
                update_dict["region"] = site.get("region")
        else:
            update_dict["site_name"] = None
            update_dict["site_region"] = None
            update_dict["region"] = None
            
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": update_dict}
    )
    return {"message": "Ticket edited successfully"}

async def close_ticket(ticket_id: str):
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": {"status": "Closed", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Ticket closed successfully"}

async def reopen_ticket(ticket_id: str):
    ticket = await db.tickets.find_one({"id": ticket_id}, {"_id": 0})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": {"status": "INTERNAL", "updated_at": datetime.now(timezone.utc).isoformat()}}
    )
    return {"message": "Ticket reopened successfully"}

async def add_ticket_comment(ticket_id: str, comment_data: TicketComment, current_user: dict):
    comment = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "user_name": current_user["username"],
        "comment": comment_data.comment,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$push": {"comments": comment}}
    )
    return {"message": "Comment added successfully"}

async def link_report_to_ticket(ticket_id: str, report_id: str):
    await db.tickets.update_one(
        {"id": ticket_id},
        {"$set": {"linked_report_id": report_id}}
    )
    return {"message": "Report linked to ticket successfully"}

async def delete_ticket(ticket_id: str, current_user: dict):
    is_admin_tech = await is_admin_tech_ops(current_user)
    if current_user["role"] not in ["Admin", "SuperUser", "Manager", "VP"] and not is_admin_tech:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to delete tickets"
        )
    
    ticket = await db.tickets.find_one({"id": ticket_id})
    if not ticket:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    ticket_no = ticket.get("ticket_number", "unknown")
    notif_delete_result = await db.notifications.delete_many({"related_id": ticket_id})
    delete_result = await db.tickets.delete_one({"id": ticket_id})
    
    if delete_result.deleted_count > 0:
        logging.info(f"[TICKET] Deleted ticket {ticket_id} ({ticket_no}) and {notif_delete_result.deleted_count} associated notifications by user {current_user['username']}")
    
    return {"message": "Ticket deleted successfully"}
