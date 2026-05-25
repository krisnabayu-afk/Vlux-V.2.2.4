"""
Migration Router
Helper endpoints for migrating from hardcoded division strings to ID-based system
These endpoints should be run once to set up the new system

USAGE:
1. Create all divisions from existing division names: POST /api/migrate/create-divisions
2. Initialize org config with mappings: POST /api/migrate/init-org-config
3. Migrate existing users to use IDs: POST /api/migrate/users-to-ids
"""

from fastapi import APIRouter, Depends, HTTPException, status
from datetime import datetime, timezone

from database import db
from utils import get_current_user
from models import Division, OrganizationConfig, DivisionMapping

router = APIRouter()


# ============ CREATE DIVISIONS FROM EXISTING NAMES ============

@router.post("/migrate/create-divisions")
async def create_divisions_from_names(current_user: dict = Depends(get_current_user)):
    """
    Create Division records for all division names found in departments
    This should be run first before other migrations
    """
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can perform migrations")
    
    # Get all departments
    departments = await db.departments.find({}, {"_id": 0}).to_list(None)
    
    created_count = 0
    errors = []
    
    for dept in departments:
        dept_id = dept["id"]
        division_names = dept.get("divisions", [])
        
        for div_name in division_names:
            try:
                # Check if division already exists
                existing = await db.divisions.find_one({
                    "name": div_name,
                    "department_id": dept_id
                }, {"_id": 0})
                
                if existing:
                    continue  # Already exists, skip
                
                # Create new division
                division = Division(
                    name=div_name,
                    department_id=dept_id,
                    display_name=div_name,
                    is_fiberzone=(div_name.lower() == "fiberzone"),
                )
                
                doc = division.model_dump()
                doc["created_at"] = doc["created_at"].isoformat()
                doc["updated_at"] = doc["updated_at"].isoformat()
                
                await db.divisions.insert_one(doc)
                
                # Add to department's division_ids list
                await db.departments.update_one(
                    {"id": dept_id},
                    {"$push": {"division_ids": division.id}},
                )
                
                created_count += 1
            
            except Exception as e:
                errors.append(f"Error creating division '{div_name}' in dept '{dept['name']}': {str(e)}")
    
    return {
        "message": f"Successfully created {created_count} divisions",
        "departments_processed": len(departments),
        "errors": errors,
    }


# ============ INITIALIZE ORGANIZATION CONFIG ============

@router.post("/migrate/init-org-config")
async def initialize_org_config(current_user: dict = Depends(get_current_user)):
    """
    Auto-detect and configure organization settings based on existing divisions
    Maps division names to IDs and sets up hierarchies
    """
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can perform migrations")
    
    # Get all divisions
    all_divisions = await db.divisions.find({}, {"_id": 0}).to_list(None)
    
    # Build name->ID map
    div_by_name = {d["name"]: d["id"] for d in all_divisions}
    
    # Try to find common division IDs
    mappings = DivisionMapping(
        fiberzone_division_id=div_by_name.get("Fiberzone"),
        apps_division_id=div_by_name.get("Apps"),
        infra_division_id=div_by_name.get("Infra"),
        ts_division_id=div_by_name.get("TS"),
        admin_division_id=div_by_name.get("Admin"),
    )
    
    # Set up division hierarchy if we have the cross-divisions
    division_hierarchy = {}
    if div_by_name.get("TS") and div_by_name.get("Apps"):
        division_hierarchy[div_by_name["TS"]] = [div_by_name["Apps"]]
    if div_by_name.get("Infra") and div_by_name.get("Fiberzone"):
        division_hierarchy[div_by_name["Infra"]] = [div_by_name["Fiberzone"]]
    
    # Set up concatenations
    division_concatenations = {}
    if div_by_name.get("Infra") and div_by_name.get("Fiberzone"):
        division_concatenations["Infra & Fiberzone"] = [
            div_by_name["Infra"],
            div_by_name["Fiberzone"]
        ]
    if div_by_name.get("TS") and div_by_name.get("Apps"):
        division_concatenations["TS & Apps"] = [
            div_by_name["TS"],
            div_by_name["Apps"]
        ]
    
    # Set staff-only divisions
    staff_only_ids = []
    if div_by_name.get("Apps"):
        staff_only_ids.append(div_by_name["Apps"])
    if div_by_name.get("Fiberzone"):
        staff_only_ids.append(div_by_name["Fiberzone"])
    
    # Create/update org config
    org_config = OrganizationConfig(
        division_mappings=mappings,
        division_hierarchy=division_hierarchy,
        division_concatenations=division_concatenations,
        staff_only_division_ids=staff_only_ids,
    )
    
    doc = org_config.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    
    await db.org_config.update_one(
        {"id": "org_config"},
        {"$set": doc},
        upsert=True,
    )
    
    return {
        "message": "Organization config initialized",
        "mappings": {
            "fiberzone_id": mappings.fiberzone_division_id,
            "apps_id": mappings.apps_division_id,
            "infra_id": mappings.infra_division_id,
            "ts_id": mappings.ts_division_id,
        },
        "staff_only_division_ids": staff_only_ids,
        "hierarchy": division_hierarchy,
        "concatenations": division_concatenations,
    }


# ============ MIGRATE USERS TO USE DIVISION IDs ============

@router.post("/migrate/users-to-ids")
async def migrate_users_to_ids(current_user: dict = Depends(get_current_user)):
    """
    Migrate existing users to populate division_id and department_id fields
    This populates the new ID fields from existing string fields
    """
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can perform migrations")
    
    # Get all users
    users = await db.users.find({}, {"_id": 0}).to_list(None)
    
    migrated_count = 0
    errors = []
    
    for user in users:
        try:
            updated = False
            
            # Look up division_id from division string if not set
            if user.get("division") and not user.get("division_id"):
                division = await db.divisions.find_one({
                    "name": user["division"]
                }, {"_id": 0})
                
                if division:
                    user["division_id"] = division["id"]
                    updated = True
                else:
                    errors.append(f"User {user['id']}: Division '{user['division']}' not found")
            
            # Look up department_id from department string if not set
            if user.get("department") and not user.get("department_id"):
                department = await db.departments.find_one({
                    "name": user["department"]
                }, {"_id": 0})
                
                if department:
                    user["department_id"] = department["id"]
                    updated = True
                else:
                    errors.append(f"User {user['id']}: Department '{user['department']}' not found")
            
            # Update user if any fields changed
            if updated:
                await db.users.update_one(
                    {"id": user["id"]},
                    {"$set": {
                        "division_id": user.get("division_id"),
                        "department_id": user.get("department_id"),
                    }},
                )
                migrated_count += 1
        
        except Exception as e:
            errors.append(f"Error migrating user {user.get('id', 'unknown')}: {str(e)}")
    
    return {
        "message": f"Successfully migrated {migrated_count} users",
        "total_users_processed": len(users),
        "errors": errors,
    }


# ============ MIGRATE HISTORICAL DATA TO USE IDs ============

@router.post("/migrate/historical-data-to-ids")
async def migrate_historical_data_to_ids(current_user: dict = Depends(get_current_user)):
    """
    Migrate existing tickets, schedules, and reports to populate division_id fields.
    """
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can perform migrations")
    
    divisions = await db.divisions.find({}, {"_id": 0}).to_list(None)
    div_by_name = {d["name"]: d["id"] for d in divisions}
    
    departments = await db.departments.find({}, {"_id": 0}).to_list(None)
    dept_by_name = {d["name"]: d["id"] for d in departments}

    errors = []
    migrated = {"tickets": 0, "schedules": 0, "reports": 0}

    # Migrate Tickets
    tickets = await db.tickets.find({"assigned_to_division_id": {"$exists": False}}, {"_id": 0}).to_list(None)
    for ticket in tickets:
        div_name = ticket.get("assigned_to_division")
        if div_name and div_name in div_by_name:
            await db.tickets.update_one(
                {"id": ticket["id"]},
                {"$set": {"assigned_to_division_id": div_by_name[div_name]}}
            )
            migrated["tickets"] += 1
        elif div_name:
            errors.append(f"Ticket {ticket['id']}: Division '{div_name}' not found")

    # Migrate Schedules
    schedules = await db.schedules.find({"division_id": {"$exists": False}}, {"_id": 0}).to_list(None)
    for schedule in schedules:
        div_name = schedule.get("division")
        if div_name and div_name in div_by_name:
            await db.schedules.update_one(
                {"id": schedule["id"]},
                {"$set": {"division_id": div_by_name[div_name]}}
            )
            migrated["schedules"] += 1
        elif div_name:
            errors.append(f"Schedule {schedule['id']}: Division '{div_name}' not found")

    # Migrate Reports
    reports = await db.reports.find({
        "$or": [
            {"division_id": {"$exists": False}},
            {"department_id": {"$exists": False}}
        ]
    }, {"_id": 0}).to_list(None)
    
    for report in reports:
        update_fields = {}
        # Reports don't directly have division, they derive from submitter, but we can look up department
        dept_name = report.get("department")
        if dept_name and dept_name in dept_by_name:
            update_fields["department_id"] = dept_by_name[dept_name]
        elif dept_name:
            errors.append(f"Report {report['id']}: Department '{dept_name}' not found")
            
        if update_fields:
            await db.reports.update_one(
                {"id": report["id"]},
                {"$set": update_fields}
            )
            migrated["reports"] += 1

    return {
        "message": "Historical data migration completed",
        "migrated": migrated,
        "errors": errors,
    }


# ============ MARK DIVISIONS AS STAFF-ONLY ============

@router.post("/migrate/mark-staff-only")
async def mark_staff_only_divisions(current_user: dict = Depends(get_current_user)):
    """
    Mark App and Fiberzone divisions as staff-only in the Division collection
    """
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can perform migrations")
    
    marked_count = 0
    
    # Mark known staff-only divisions
    staff_only_names = ["Apps", "Fiberzone"]
    
    for name in staff_only_names:
        result = await db.divisions.update_many(
            {"name": name},
            {"$set": {"is_staff_only": True}},
        )
        marked_count += result.modified_count
    
    return {
        "message": f"Marked {marked_count} divisions as staff-only",
        "divisions": staff_only_names,
    }


# ============ MIGRATION STATUS ============

@router.get("/migrate/status")
async def migration_status(current_user: dict = Depends(get_current_user)):
    """Get status of migration progress"""
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can view migration status")
    
    # Count divisions created
    division_count = await db.divisions.count_documents({})
    
    # Count users with both string and ID fields
    users_with_ids = await db.users.count_documents({
        "division_id": {"$exists": True, "$ne": None},
        "department_id": {"$exists": True, "$ne": None},
    })
    total_users = await db.users.count_documents({})
    
    # Check if org config exists
    org_config = await db.org_config.find_one({"id": "org_config"}, {"_id": 0})
    
    return {
        "divisions_created": division_count,
        "users_migrated": users_with_ids,
        "total_users": total_users,
        "org_config_initialized": org_config is not None,
        "migration_complete": (
            division_count > 0 and
            users_with_ids == total_users and
            org_config is not None
        ),
    }


# ============ ROLLBACK HELPERS ============

@router.post("/migrate/rollback-divisions")
async def rollback_divisions(current_user: dict = Depends(get_current_user)):
    """
    DELETE all divisions (for testing/rollback only)
    Use with caution!
    """
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can perform rollbacks")
    
    result = await db.divisions.delete_many({})
    
    # Clear division_ids from departments
    await db.departments.update_many({}, {"$set": {"division_ids": []}})
    
    return {"message": f"Deleted {result.deleted_count} divisions"}


@router.post("/migrate/rollback-user-ids")
async def rollback_user_ids(current_user: dict = Depends(get_current_user)):
    """
    CLEAR division_id and department_id from all users (for testing/rollback only)
    """
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can perform rollbacks")
    
    result = await db.users.update_many(
        {},
        {"$unset": {"division_id": "", "department_id": ""}},
    )
    
    return {"message": f"Cleared IDs from {result.modified_count} users"}
