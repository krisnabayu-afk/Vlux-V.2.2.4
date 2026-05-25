from fastapi import HTTPException
from database import db
from models import ActivityCategory, CategoryCreate

async def get_activity_categories():
    categories = await db.activity_categories.find({}, {"_id": 0}).to_list(100)
    return categories

async def create_activity_category(category_data: CategoryCreate, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can create activity categories")
    
    existing = await db.activity_categories.find_one({"name": category_data.name}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Category with this name already exists")
        
    category = ActivityCategory(
        name=category_data.name,
        created_by=current_user["id"]
    )
    doc = category.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.activity_categories.insert_one(doc)
    return {"message": "Category created successfully", "id": category.id}

async def delete_activity_category(category_id: str, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can delete activity categories")
        
    result = await db.activity_categories.delete_one({"id": category_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted successfully"}
