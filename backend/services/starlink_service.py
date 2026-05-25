from datetime import datetime, timezone, timedelta
from fastapi import HTTPException

from database import db
from models import Starlink, StarlinkCreate, StarlinkUpdate

async def get_starlinks():
    starlinks = await db.starlinks.find({}, {"_id": 0}).to_list(1000)
    return starlinks

async def create_starlink(starlink_data: StarlinkCreate, current_user: dict):
    if current_user["role"] not in ["Manager", "VP"]:
       raise HTTPException(status_code=403, detail="Only Managers and VP can add Starlink data")
    try:
        exp_date = datetime.fromisoformat(starlink_data.expiration_date.replace('Z', '+00:00'))
    except ValueError:
        exp_date = datetime.strptime(starlink_data.expiration_date, "%Y-%m-%d").replace(tzinfo=timezone.utc)
    
    starlink = Starlink(
        name=starlink_data.name,
        sn=starlink_data.sn,
        position=starlink_data.position,
        account_email=starlink_data.account_email,
        package_status=starlink_data.package_status,
        expiration_date=exp_date,
        created_by=current_user["id"]
    )
    doc = starlink.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    doc['expiration_date'] = doc['expiration_date'].isoformat()
    await db.starlinks.insert_one(doc)
    return {"message": "Starlink added successfully", "id": starlink.id}

async def update_starlink(id: str, starlink_data: StarlinkUpdate, current_user: dict):
    if current_user["role"] not in ["Manager", "VP"]:
       raise HTTPException(status_code=403, detail="Only Managers and VP can edit Starlink data")
    update_dict = {k: v for k, v in starlink_data.model_dump().items() if v is not None}
    if "expiration_date" in update_dict:
         try:
            exp_date = datetime.fromisoformat(update_dict["expiration_date"].replace('Z', '+00:00'))
         except ValueError:
            exp_date = datetime.strptime(update_dict["expiration_date"], "%Y-%m-%d").replace(tzinfo=timezone.utc)
         update_dict["expiration_date"] = exp_date.isoformat()
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    result = await db.starlinks.update_one({"id": id}, {"$set": update_dict})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Starlink not found")
    return {"message": "Starlink updated successfully"}

async def delete_starlink(id: str, current_user: dict):
    if current_user["role"] not in ["Manager", "VP"]:
       raise HTTPException(status_code=403, detail="Only Managers and VP can delete Starlink data")
    result = await db.starlinks.delete_one({"id": id})
    if result.deleted_count == 0:
         raise HTTPException(status_code=404, detail="Starlink not found")
    return {"message": "Starlink deleted successfully"}

async def renew_starlink(id: str, current_user: dict):
    if current_user["role"] not in ["Manager", "VP"]:
       raise HTTPException(status_code=403, detail="Only Managers and VP can renew Starlink packages")
    starlink = await db.starlinks.find_one({"id": id})
    if not starlink:
        raise HTTPException(status_code=404, detail="Starlink not found")
        
    new_expiration = datetime.now(timezone.utc) + timedelta(days=30)
    await db.starlinks.update_one(
        {"id": id},
        {
            "$set": {
                "expiration_date": new_expiration.isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }
        }
    )
    return {"message": "Package renewed successfully", "new_expiration_date": new_expiration.isoformat()}
