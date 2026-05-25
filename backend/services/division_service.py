from datetime import datetime, timezone
from typing import List, Optional
from fastapi import HTTPException

from database import db
from models import Division, DivisionCreate, DivisionUpdate

async def list_divisions(status_filter: Optional[str], department_id: Optional[str]):
    query = {}
    if status_filter:
        query["status"] = status_filter
    if department_id:
        query["department_id"] = department_id
    
    divisions = await db.divisions.find(query, {"_id": 0}).sort("display_order", 1).to_list(None)
    return divisions

async def fetch_division_by_id(division_id: str):
    division = await db.divisions.find_one({"id": division_id}, {"_id": 0})
    if not division:
        raise HTTPException(status_code=404, detail="Division not found")
    return division

async def create_division(div_data: DivisionCreate, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can create divisions")
    
    dept = await db.departments.find_one({"id": div_data.department_id}, {"_id": 0})
    if not dept:
        raise HTTPException(status_code=400, detail="Department not found")
    
    if div_data.parent_division_id:
        parent = await db.divisions.find_one({"id": div_data.parent_division_id}, {"_id": 0})
        if not parent:
            raise HTTPException(status_code=400, detail="Parent division not found")
    
    if div_data.child_division_ids:
        for child_id in div_data.child_division_ids:
            child = await db.divisions.find_one({"id": child_id}, {"_id": 0})
            if not child:
                raise HTTPException(status_code=400, detail=f"Child division {child_id} not found")
    
    existing = await db.divisions.find_one(
        {"name": div_data.name, "department_id": div_data.department_id}
    )
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Division '{div_data.name}' already exists in this department"
        )
    
    division = Division(
        name=div_data.name,
        department_id=div_data.department_id,
        display_name=div_data.display_name or div_data.name,
        description=div_data.description,
        is_staff_only=div_data.is_staff_only,
        is_manager_division=div_data.is_manager_division,
        is_admin_division=div_data.is_admin_division,
        parent_division_id=div_data.parent_division_id,
        child_division_ids=div_data.child_division_ids,
        concatenated_divisions=div_data.concatenated_divisions,
        is_fiberzone=div_data.is_fiberzone,
        allowed_email_domains=div_data.allowed_email_domains,
        display_order=div_data.display_order,
    )
    
    doc = division.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    
    await db.divisions.insert_one(doc)
    
    await db.departments.update_one(
        {"id": div_data.department_id},
        {"$push": {"division_ids": division.id}},
    )
    
    return division

async def update_division(division_id: str, div_data: DivisionUpdate, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can update divisions")
    
    division = await db.divisions.find_one({"id": division_id}, {"_id": 0})
    if not division:
        raise HTTPException(status_code=404, detail="Division not found")
    
    update_dict = {}
    for field, value in div_data.model_dump().items():
        if value is not None:
            update_dict[field] = value
    
    if not update_dict:
        return division
    
    if "parent_division_id" in update_dict and update_dict["parent_division_id"]:
        parent = await db.divisions.find_one(
            {"id": update_dict["parent_division_id"]}, {"_id": 0}
        )
        if not parent:
            raise HTTPException(status_code=400, detail="Parent division not found")
    
    if "child_division_ids" in update_dict and update_dict["child_division_ids"]:
        for child_id in update_dict["child_division_ids"]:
            child = await db.divisions.find_one({"id": child_id}, {"_id": 0})
            if not child:
                raise HTTPException(status_code=400, detail=f"Child division {child_id} not found")
    
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.divisions.update_one({"id": division_id}, {"$set": update_dict})
    
    updated_division = await db.divisions.find_one({"id": division_id}, {"_id": 0})
    return updated_division

async def delete_division(division_id: str, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can delete divisions")
    
    division = await db.divisions.find_one({"id": division_id}, {"_id": 0})
    if not division:
        raise HTTPException(status_code=404, detail="Division not found")
    
    user_count = await db.users.count_documents(
        {"$or": [{"division_id": division_id}, {"division": division.get("name")}]}
    )
    if user_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete division with {user_count} assigned users. Reassign users first.",
        )
    
    await db.departments.update_one(
        {"id": division["department_id"]},
        {"$pull": {"division_ids": division_id}},
    )
    
    await db.divisions.delete_one({"id": division_id})
    
    return {"message": f"Division '{division['name']}' deleted successfully"}

async def fetch_department_divisions(department_id: str):
    dept = await db.departments.find_one({"id": department_id}, {"_id": 0})
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    
    divisions = await db.divisions.find(
        {"department_id": department_id}, {"_id": 0}
    ).sort("display_order", 1).to_list(None)
    
    return divisions

async def fetch_division_hierarchy(division_id: str):
    division = await db.divisions.find_one({"id": division_id}, {"_id": 0})
    if not division:
        raise HTTPException(status_code=404, detail="Division not found")
    
    parent = None
    if division.get("parent_division_id"):
        parent = await db.divisions.find_one(
            {"id": division["parent_division_id"]}, {"_id": 0}
        )
    
    children = []
    if division.get("child_division_ids"):
        children = await db.divisions.find(
            {"id": {"$in": division["child_division_ids"]}}, {"_id": 0}
        ).to_list(None)
    
    return {
        "division_id": division_id,
        "division_name": division.get("name"),
        "parent": parent,
        "children": children,
    }

async def resolve_division_name(division_name: str):
    division = await db.divisions.find_one({"name": division_name}, {"_id": 0})
    if not division:
        raise HTTPException(
            status_code=404,
            detail=f"Division '{division_name}' not found",
        )
    return {
        "division_id": division["id"],
        "division_name": division["name"],
        "display_name": division.get("display_name", division["name"]),
    }

async def fetch_concatenated_divisions(concat_label: str):
    org_config = await db.org_config.find_one({"id": "org_config"}, {"_id": 0})
    if not org_config:
        raise HTTPException(status_code=404, detail="Organization config not found")
    
    concatenations = org_config.get("division_concatenations", {})
    if concat_label not in concatenations:
        raise HTTPException(
            status_code=404,
            detail=f"Concatenation '{concat_label}' not configured",
        )
    
    div_ids = concatenations[concat_label]
    divisions = await db.divisions.find(
        {"id": {"$in": div_ids}}, {"_id": 0}
    ).to_list(None)
    
    return {
        "label": concat_label,
        "division_ids": div_ids,
        "divisions": divisions,
    }
