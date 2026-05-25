from fastapi import HTTPException
from database import db
from models import SummaryPreset, SummaryPresetCreate

DEFAULT_SUMMARY_PRESETS = [
    "Survey",
    "Vendor",
    "Request Barang",
    "Pengadaan Barang",
    "Setup & Konfigurasi AP/Switch",
    "Setup & Konfigurasi Vlepo STB/TAAS",
    "Pengiriman Barang",
    "Installasi FO Lastmile/Link",
    "Installasi Wireless",
    "Installasi Kabel Distribusi (panel)",
    "Installasi Kabel Backbone",
    "Installasi Kabel Endpoint (AP)",
    "Installasi Switch",
    "Installasi AP",
    "Installasi Vlepo",
    "Comissioning Test",
    "BAST",
]

async def list_summary_presets():
    count = await db.summary_presets.count_documents({})
    if count == 0:
        for i, name in enumerate(DEFAULT_SUMMARY_PRESETS):
            preset = SummaryPreset(name=name, order=i)
            doc = preset.model_dump()
            doc["created_at"] = doc["created_at"].isoformat()
            await db.summary_presets.insert_one(doc)

    presets = await db.summary_presets.find(
        {}, {"_id": 0}
    ).sort("order", 1).to_list(500)
    return presets

async def create_summary_preset(data: SummaryPresetCreate):
    existing = await db.summary_presets.find_one({"name": data.name})
    if existing:
        raise HTTPException(status_code=400, detail=f"Preset '{data.name}' already exists")

    preset = SummaryPreset(name=data.name, order=data.order)
    doc = preset.model_dump()
    doc["created_at"] = doc["created_at"].isoformat()
    await db.summary_presets.insert_one(doc)
    return {"message": "Summary preset created", "id": preset.id}

async def update_summary_preset(preset_id: str, data: SummaryPresetCreate):
    existing = await db.summary_presets.find_one({"id": preset_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Preset not found")

    dup = await db.summary_presets.find_one({"name": data.name, "id": {"$ne": preset_id}})
    if dup:
        raise HTTPException(status_code=400, detail=f"Preset '{data.name}' already exists")

    await db.summary_presets.update_one(
        {"id": preset_id},
        {"$set": {"name": data.name, "order": data.order}},
    )
    return {"message": "Summary preset updated"}

async def delete_summary_preset(preset_id: str):
    result = await db.summary_presets.delete_one({"id": preset_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Preset not found")
    return {"message": "Summary preset deleted"}

async def seed_summary_presets():
    count = await db.summary_presets.count_documents({})
    if count > 0:
        return {"message": "Presets already exist", "count": count}

    for i, name in enumerate(DEFAULT_SUMMARY_PRESETS):
        preset = SummaryPreset(name=name, order=i)
        doc = preset.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        await db.summary_presets.insert_one(doc)

    return {"message": f"Seeded {len(DEFAULT_SUMMARY_PRESETS)} default presets"}
