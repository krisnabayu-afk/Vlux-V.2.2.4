from datetime import datetime, timezone
from fastapi import HTTPException

from database import db
from models import DepartmentPermission, DepartmentPermissionUpsert

ALL_MENU_KEYS = [
    "scheduler",
    "activity",
    "reports",
    "tickets",
    "ttb",
    "sites",
    "projects",
    "fiberzone",
]

UNRESTRICTED_ROLES = {"SuperUser"}

def _default_permission(dept_id: str, dept_name: str, menu_key: str) -> dict:
    return {
        "department_id": dept_id,
        "department_name": dept_name,
        "menu_key": menu_key,
        "can_view": True,
        "can_edit": True,
        "report_visibility": "all",
    }

async def list_all_permissions(current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can manage permissions")
    rows = await db.department_permissions.find({}, {"_id": 0}).to_list(None)
    return rows

async def get_department_permissions(dept_id: str, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can manage permissions")

    dept = await db.departments.find_one({"id": dept_id}, {"_id": 0})
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    rows = await db.department_permissions.find(
        {"department_id": dept_id}, {"_id": 0}
    ).to_list(None)

    perm_map = {r["menu_key"]: r for r in rows}
    result = []
    for key in ALL_MENU_KEYS:
        if key in perm_map:
            result.append(perm_map[key])
        else:
            result.append(_default_permission(dept_id, dept["name"], key))

    return result

async def upsert_department_permissions(
    dept_id: str,
    payload: DepartmentPermissionUpsert,
    current_user: dict
):
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can manage permissions")

    dept = await db.departments.find_one({"id": dept_id}, {"_id": 0})
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    now = datetime.now(timezone.utc).isoformat()

    for perm_data in payload.permissions:
        menu_key = perm_data.get("menu_key")
        if not menu_key or menu_key not in ALL_MENU_KEYS:
            continue

        update_doc = {
            "department_id": dept_id,
            "department_name": dept["name"],
            "menu_key": menu_key,
            "can_view": bool(perm_data.get("can_view", True)),
            "can_edit": bool(perm_data.get("can_edit", True)),
            "report_visibility": perm_data.get("report_visibility", "all"),
            "updated_at": now,
        }

        existing = await db.department_permissions.find_one(
            {"department_id": dept_id, "menu_key": menu_key}
        )
        if existing:
            await db.department_permissions.update_one(
                {"department_id": dept_id, "menu_key": menu_key},
                {"$set": update_doc},
            )
        else:
            perm = DepartmentPermission(**update_doc)
            doc = perm.model_dump()
            doc["updated_at"] = doc["updated_at"].isoformat()
            await db.department_permissions.insert_one(doc)

    return {"message": "Permissions saved successfully"}

async def get_my_permissions(current_user: dict):
    if current_user["role"] in UNRESTRICTED_ROLES:
        return {}

    dept_name = current_user.get("department")
    if not dept_name:
        return {}

    dept = await db.departments.find_one({"name": dept_name}, {"_id": 0})
    if not dept:
        return {}

    rows = await db.department_permissions.find(
        {"department_id": dept["id"]}, {"_id": 0}
    ).to_list(None)

    result = {}
    existing_keys = {r["menu_key"]: r for r in rows}
    for key in ALL_MENU_KEYS:
        if key in existing_keys:
            r = existing_keys[key]
            result[key] = {
                "can_view": r.get("can_view", True),
                "can_edit": r.get("can_edit", True),
                "report_visibility": r.get("report_visibility", "all"),
            }
        else:
            result[key] = {"can_view": True, "can_edit": True, "report_visibility": "all"}

    return result
