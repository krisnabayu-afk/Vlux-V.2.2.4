import math
from typing import Optional, List
from fastapi import HTTPException

from database import db
from utils import get_password_hash
from models import (
    User, UserCreate, UserResponse, UserUpdateAdmin,
    AdminResetPasswordRequest
)

async def create_user_direct(user_data: UserCreate, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can create users directly")
        
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
        
    user_region = None if user_data.role == "VP" else user_data.region
        
    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role,
        department=user_data.department,
        division=user_data.division,
        region=user_region,
        account_status="approved"
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    
    return UserResponse(**doc)

async def delete_user(user_id: str, current_user: dict):
    if current_user["role"] not in ["SuperUser", "VP"]:
        raise HTTPException(status_code=403, detail="Only SuperUser and VP can delete users")
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own account")
        
    if current_user["role"] == "VP":
        target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        target_department = target_user.get("department")
        if not target_department:
            org_config = await db.org_config.find_one({"id": "org_config"})
            tech_ops_id = org_config.get("division_mappings", {}).get("tech_ops_department_id") if org_config else None
            if tech_ops_id and target_user.get("department_id") == tech_ops_id:
                target_department = "Technical Operation"
            elif target_user.get("department") == "Technical Operation":
                target_department = "Technical Operation"
            elif target_user.get("division") in ["Monitoring", "Infra", "TS", "Apps", "Fiberzone", "Admin", "Internal Support"]:
                target_department = "Technical Operation"
        if target_department != current_user.get("department"):
            raise HTTPException(status_code=403, detail="VP can only delete users in their own department")
            
    result = await db.users.delete_one({"id": user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "User deleted successfully"}

async def update_user_admin(user_id: str, update_data: UserUpdateAdmin, current_user: dict):
    if current_user["role"] not in ["SuperUser", "VP"]:
        raise HTTPException(status_code=403, detail="Only SuperUser and VP can update user details")
        
    if current_user["role"] == "VP":
        target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        target_department = target_user.get("department")
        if not target_department:
            org_config = await db.org_config.find_one({"id": "org_config"})
            tech_ops_id = org_config.get("division_mappings", {}).get("tech_ops_department_id") if org_config else None
            if tech_ops_id and target_user.get("department_id") == tech_ops_id:
                target_department = "Technical Operation"
            elif target_user.get("department") == "Technical Operation":
                target_department = "Technical Operation"
            elif target_user.get("division") in ["Monitoring", "Infra", "TS", "Apps", "Fiberzone", "Admin", "Internal Support"]:
                target_department = "Technical Operation"
        if target_department != current_user.get("department"):
            raise HTTPException(status_code=403, detail="VP can only update users in their own department")
        if update_data.role == "SuperUser":
             raise HTTPException(status_code=403, detail="VP cannot elevate users to SuperUser")
             
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    if update_dict:
        if "is_project_leader" in update_dict and current_user["role"] != "SuperUser":
            del update_dict["is_project_leader"]
            
        if update_dict:
            await db.users.update_one(
                {"id": user_id},
                {"$set": update_dict}
            )
    return {"message": "User updated successfully"}

async def admin_reset_password(user_id: str, payload: AdminResetPasswordRequest, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can manually reset passwords")
    
    target_user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    password_hash = get_password_hash(payload.new_password)
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password_hash": password_hash}}
    )
    return {"message": "Password has been successfully reset."}

async def fetch_access_logs(page: int, limit: int, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can view access logs")
    
    total = await db.user_access_logs.count_documents({})
    total_pages = math.ceil(total / limit) if total > 0 else 1
    skip = (page - 1) * limit
    
    logs = await db.user_access_logs.find(
        {}, {"_id": 0}
    ).sort("access_time", -1).skip(skip).limit(limit).to_list(limit)
    
    return {
        "items": logs,
        "total": total,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }

async def fetch_users(is_project_leader: Optional[bool], current_user: dict):
    if current_user["role"] == "SuperUser":
        query = {}
    else:
        query = {"account_status": "approved"}
    
    if is_project_leader is not None:
        query["is_project_leader"] = is_project_leader

    if current_user["role"] == "VP":
        query.pop("account_status", None)
        dept_name = current_user.get("department")
        if not dept_name:
            org_config = await db.org_config.find_one({"id": "org_config"})
            tech_ops_id = org_config.get("division_mappings", {}).get("tech_ops_department_id") if org_config else None
            if tech_ops_id and current_user.get("department_id") == tech_ops_id:
                dept_name = "Technical Operation"
            elif current_user.get("department") == "Technical Operation":
                dept_name = "Technical Operation"
            elif current_user.get("division") in ["Monitoring", "Infra", "TS", "Apps", "Fiberzone", "Admin", "Internal Support"]:
                dept_name = "Technical Operation"
            
        if dept_name:
            dept = await db.departments.find_one({"name": dept_name})
            target_divisions = dept.get("divisions", []) if dept else []
            
            if target_divisions:
                 query["$or"] = [
                     {"department": dept_name},
                     {"department": None, "division": {"$in": target_divisions}},
                     {"department": {"$exists": False}, "division": {"$in": target_divisions}}
                 ]
            else:
                 query["department"] = dept_name
        else:
            query["id"] = current_user["id"]
        query["role"] = {"$ne": "SuperUser"}
        
    users = await db.users.find(query, {"_id": 0, "password_hash": 0, "profile_photo": 0}).to_list(1000)
    
    all_depts = await db.departments.find({}, {"id": 1, "name": 1}).to_list(None)
    all_divs = await db.divisions.find({}, {"id": 1, "name": 1}).to_list(None)
    dept_map = {d["id"]: d["name"] for d in all_depts}
    div_map = {d["id"]: d["name"] for d in all_divs}
    
    for u in users:
        if u.get("department_id") and u["department_id"] in dept_map:
            u["department"] = dept_map[u["department_id"]]
        if u.get("division_id") and u["division_id"] in div_map:
            u["division"] = div_map[u["division_id"]]

    return [UserResponse(**user) for user in users]

async def fetch_user_by_id(user_id: str):
    user = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if user.get("department_id"):
        dept = await db.departments.find_one({"id": user["department_id"]}, {"name": 1})
        if dept: user["department"] = dept["name"]
    if user.get("division_id"):
        div = await db.divisions.find_one({"id": user["division_id"]}, {"name": 1})
        if div: user["division"] = div["name"]
        
    return UserResponse(**user)

async def fetch_users_by_division(division: str):
    users = await db.users.find({"division": division, "account_status": "approved"}, {"_id": 0, "password_hash": 0, "profile_photo": 0}).to_list(1000)
    return [UserResponse(**user) for user in users]
