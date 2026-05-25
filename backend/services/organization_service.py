from datetime import datetime, timezone
from fastapi import HTTPException, status

from database import db
from models import OrganizationConfig, OrganizationConfigUpdate, DivisionMapping

async def get_org_config(current_user: dict):
    org_config = await db.org_config.find_one({"id": "org_config"}, {"_id": 0})
    if not org_config:
        return OrganizationConfig()
    return org_config

async def update_org_config(config_data: OrganizationConfigUpdate, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SuperUser can modify organization config",
        )
    
    update_dict = {k: v for k, v in config_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.org_config.update_one(
        {"id": "org_config"},
        {"$set": update_dict},
        upsert=True,
    )
    
    updated_config = await db.org_config.find_one({"id": "org_config"}, {"_id": 0})
    return updated_config

async def set_division_mapping(mapping: DivisionMapping, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SuperUser can set division mappings",
        )
    
    all_div_ids = [
        mapping.manager_division_id,
        mapping.admin_division_id,
        mapping.fiberzone_division_id,
        mapping.apps_division_id,
        mapping.infra_division_id,
        mapping.ts_division_id,
    ]
    
    for div_id in all_div_ids:
        if div_id:
            div = await db.divisions.find_one({"id": div_id}, {"_id": 0})
            if not div:
                raise HTTPException(
                    status_code=400,
                    detail=f"Division ID '{div_id}' not found",
                )
    
    if mapping.tech_ops_department_id:
        dept = await db.departments.find_one({"id": mapping.tech_ops_department_id}, {"_id": 0})
        if not dept:
            raise HTTPException(
                status_code=400,
                detail=f"Department ID '{mapping.tech_ops_department_id}' not found",
            )
            
    if mapping.sales_department_id:
        dept = await db.departments.find_one({"id": mapping.sales_department_id}, {"_id": 0})
        if not dept:
            raise HTTPException(
                status_code=400,
                detail=f"Sales Department ID '{mapping.sales_department_id}' not found",
            )
    
    update_dict = {
        "division_mappings": mapping.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.org_config.update_one(
        {"id": "org_config"},
        {"$set": update_dict},
        upsert=True,
    )
    
    updated_config = await db.org_config.find_one({"id": "org_config"}, {"_id": 0})
    return updated_config

async def set_division_hierarchy(hierarchy_data: dict, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SuperUser can set division hierarchy",
        )
    
    division_hierarchy = hierarchy_data.get("hierarchy", {})
    
    all_ids = set()
    for parent_id, child_ids in division_hierarchy.items():
        all_ids.add(parent_id)
        all_ids.update(child_ids)
    
    for div_id in all_ids:
        div = await db.divisions.find_one({"id": div_id}, {"_id": 0})
        if not div:
            raise HTTPException(
                status_code=400,
                detail=f"Division ID '{div_id}' not found in hierarchy",
            )
    
    update_dict = {
        "division_hierarchy": division_hierarchy,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.org_config.update_one(
        {"id": "org_config"},
        {"$set": update_dict},
        upsert=True,
    )
    
    updated_config = await db.org_config.find_one({"id": "org_config"}, {"_id": 0})
    return updated_config

async def set_division_concatenations(concat_data: dict, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SuperUser can set division concatenations",
        )
    
    division_concatenations = concat_data.get("concatenations", {})
    
    all_ids = set()
    for label, div_ids in division_concatenations.items():
        all_ids.update(div_ids)
    
    for div_id in all_ids:
        div = await db.divisions.find_one({"id": div_id}, {"_id": 0})
        if not div:
            raise HTTPException(
                status_code=400,
                detail=f"Division ID '{div_id}' not found in concatenations",
            )
    
    update_dict = {
        "division_concatenations": division_concatenations,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.org_config.update_one(
        {"id": "org_config"},
        {"$set": update_dict},
        upsert=True,
    )
    
    updated_config = await db.org_config.find_one({"id": "org_config"}, {"_id": 0})
    return updated_config

async def set_staff_only_divisions(data: dict, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SuperUser can set staff-only divisions",
        )
    
    staff_only_ids = data.get("division_ids", [])
    
    for div_id in staff_only_ids:
        div = await db.divisions.find_one({"id": div_id}, {"_id": 0})
        if not div:
            raise HTTPException(
                status_code=400,
                detail=f"Division ID '{div_id}' not found",
            )
    
    update_dict = {
        "staff_only_division_ids": staff_only_ids,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    
    await db.org_config.update_one(
        {"id": "org_config"},
        {"$set": update_dict},
        upsert=True,
    )
    
    updated_config = await db.org_config.find_one({"id": "org_config"}, {"_id": 0})
    return updated_config

async def configure_features(features: dict, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SuperUser can configure features",
        )
    
    update_dict = {}
    if "enable_fiberzone_dashboard" in features:
        update_dict["enable_fiberzone_dashboard"] = features["enable_fiberzone_dashboard"]
    if "enable_fiberzone_special_schedule" in features:
        update_dict["enable_fiberzone_special_schedule"] = features["enable_fiberzone_special_schedule"]
    
    if not update_dict:
        return await db.org_config.find_one({"id": "org_config"}, {"_id": 0})
    
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.org_config.update_one(
        {"id": "org_config"},
        {"$set": update_dict},
        upsert=True,
    )
    
    updated_config = await db.org_config.find_one({"id": "org_config"}, {"_id": 0})
    return updated_config

async def get_fiberzone_division_id():
    org_config = await db.org_config.find_one({"id": "org_config"}, {"_id": 0})
    if not org_config:
        return {"fiberzone_division_id": None, "message": "No org config found"}
    
    fiberzone_id = org_config.get("division_mappings", {}).get("fiberzone_division_id")
    if not fiberzone_id:
        return {"fiberzone_division_id": None, "message": "Fiberzone division not configured"}
    
    division = await db.divisions.find_one({"id": fiberzone_id}, {"_id": 0})
    return {
        "fiberzone_division_id": fiberzone_id,
        "division": division,
    }

async def initialize_org_config(current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SuperUser can initialize org config",
        )
    
    all_divisions = await db.divisions.find({}, {"_id": 0}).to_list(None)
    div_by_name = {d.get("name"): d.get("id") for d in all_divisions}
    
    mappings = {
        "fiberzone_division_id": div_by_name.get("Fiberzone"),
        "apps_division_id": div_by_name.get("Apps"),
        "infra_division_id": div_by_name.get("Infra"),
        "ts_division_id": div_by_name.get("TS"),
        "admin_division_id": div_by_name.get("Admin"),
    }
    
    all_departments = await db.departments.find({}, {"_id": 0}).to_list(None)
    dept_by_name = {d.get("name"): d.get("id") for d in all_departments}
    mappings["tech_ops_department_id"] = dept_by_name.get("Technical Operation")
    
    mappings = {k: v for k, v in mappings.items() if v}
    
    hierarchy = {}
    concatenations = {
        "Infra & Fiberzone": [div_by_name.get("Infra"), div_by_name.get("Fiberzone")],
        "TS & Apps": [div_by_name.get("TS"), div_by_name.get("Apps")],
    }
    concatenations = {k: v for k, v in concatenations.items() if all(v)}
    
    org_config = OrganizationConfig(
        division_mappings=DivisionMapping(**mappings) if mappings else DivisionMapping(),
        division_hierarchy=hierarchy,
        division_concatenations=concatenations,
    )
    
    doc = org_config.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    doc["updated_at"] = doc["updated_at"].isoformat()
    
    await db.org_config.update_one(
        {"id": "org_config"},
        {"$set": doc},
        upsert=True,
    )
    
    return org_config
