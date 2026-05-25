import csv
import io
from typing import List, Optional
from fastapi import HTTPException, Response, UploadFile

from database import db
from models import Site, SiteCreate, SiteUpdate

async def create_site(site_data: SiteCreate, current_user: dict):
    site = Site(
        name=site_data.name,
        cid=site_data.cid,
        location=site_data.location,
        description=site_data.description,
        region=site_data.region,
        fiberzone=site_data.fiberzone,
        btest_link=site_data.btest_link,
        fiberlink_link=site_data.fiberlink_link,
        created_by=current_user["id"]
    )
    doc = site.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.sites.insert_one(doc)
    return {"message": "Site created successfully", "id": site.id}

async def get_sites(
    page: int, 
    limit: int,
    search: Optional[str],
    region: Optional[str],
    fiberzone: Optional[bool]
):
    pipeline = []
    match_query = {}

    if fiberzone is not None:
        match_query["fiberzone"] = fiberzone

    if search:
        match_query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"location": {"$regex": search, "$options": "i"}},
            {"cid": {"$regex": search, "$options": "i"}}
        ]
    
    if region and region != 'all':
        match_query["region"] = region

    if match_query:
        pipeline.append({"$match": match_query})
    pipeline.append({"$project": {"_id": 0}})
    
    skip = (page - 1) * limit
    facet_stage = {
        "$facet": {
            "metadata": [{"$count": "total"}],
            "data": [{"$skip": skip}, {"$limit": limit}]
        }
    }
    pipeline.append(facet_stage)
    result = await db.sites.aggregate(pipeline).to_list(1)
    
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

async def get_site(site_id: str):
    site = await db.sites.find_one({"id": site_id}, {"_id": 0})
    if not site:
        raise HTTPException(status_code=404, detail="Site not found")
    return site

async def update_site(site_id: str, site_data: SiteUpdate):
    update_dict = {k: v for k, v in site_data.model_dump().items() if v is not None}
    if update_dict:
        await db.sites.update_one(
            {"id": site_id},
            {"$set": update_dict}
        )
    return {"message": "Site updated successfully"}

async def delete_site(site_id: str, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can delete sites")
        
    result = await db.sites.delete_one({"id": site_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Site not found")
    return {"message": "Site deleted successfully"}

async def download_site_template(current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can download site template")
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["name", "cid", "location", "description", "region", "fiberzone", "btest_link", "fiberlink_link"])
    writer.writerow(["Sample Site", "VTIB-0000", "Jl. Sample No. 1", "Sample Description", "Region 1", "false", "", ""])
    
    output.seek(0)
    response = Response(content=output.getvalue(), media_type="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=sites_template.csv"
    return response

async def upload_sites_csv(file: UploadFile, current_user: dict):
    if current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Only SuperUser can upload sites")
    
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    try:
        content = await file.read()
        decoded = content.decode('utf-8')
        io_string = io.StringIO(decoded)
        reader = csv.DictReader(io_string)
        
        sites_to_insert = []
        for row in reader:
            if not row.get('name'):
                continue
            
            fiberzone_val = str(row.get('fiberzone', 'false')).lower()
            fiberzone = fiberzone_val in ['true', '1', 'yes', 'y']
            
            site = Site(
                name=row['name'],
                cid=row.get('cid'),
                location=row.get('location'),
                description=row.get('description'),
                region=row.get('region'),
                fiberzone=fiberzone,
                btest_link=row.get('btest_link'),
                fiberlink_link=row.get('fiberlink_link'),
                created_by=current_user["id"]
            )
            
            doc = site.model_dump()
            doc['created_at'] = doc['created_at'].isoformat()
            sites_to_insert.append(doc)
            
        if sites_to_insert:
            await db.sites.insert_many(sites_to_insert)
            
        return {"message": f"Successfully uploaded {len(sites_to_insert)} sites"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process CSV: {str(e)}")
