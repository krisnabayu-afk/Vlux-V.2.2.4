from datetime import datetime, timezone
from fastapi import HTTPException, status

from database import db
from models import Settings, SettingsUpdate

async def get_settings(current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SuperUser can access global settings"
        )
    
    settings = await db.settings.find_one({"id": "site_settings"}, {"_id": 0})
    if not settings:
        return Settings()
    
    return settings

async def update_settings(settings_data: SettingsUpdate, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only SuperUser can modify global settings"
        )
    
    update_dict = {k: v for k, v in settings_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.settings.update_one(
        {"id": "site_settings"},
        {"$set": update_dict},
        upsert=True
    )
    
    updated_settings = await db.settings.find_one({"id": "site_settings"}, {"_id": 0})
    return updated_settings
