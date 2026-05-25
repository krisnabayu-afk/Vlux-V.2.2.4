from fastapi import APIRouter, Depends
from models import OrganizationConfigUpdate, DivisionMapping
from utils import get_current_user
from services import organization_service

router = APIRouter()

@router.get("/org-config")
async def get_org_config(current_user: dict = Depends(get_current_user)):
    return await organization_service.get_org_config(current_user)

@router.put("/org-config")
async def update_org_config(
    config_data: OrganizationConfigUpdate,
    current_user: dict = Depends(get_current_user),
):
    return await organization_service.update_org_config(config_data, current_user)

@router.post("/org-config/mappings")
async def set_division_mapping(
    mapping: DivisionMapping,
    current_user: dict = Depends(get_current_user),
):
    return await organization_service.set_division_mapping(mapping, current_user)

@router.post("/org-config/hierarchy")
async def set_division_hierarchy(
    hierarchy_data: dict,
    current_user: dict = Depends(get_current_user),
):
    return await organization_service.set_division_hierarchy(hierarchy_data, current_user)

@router.post("/org-config/concatenations")
async def set_division_concatenations(
    concat_data: dict,
    current_user: dict = Depends(get_current_user),
):
    return await organization_service.set_division_concatenations(concat_data, current_user)

@router.post("/org-config/staff-only-divisions")
async def set_staff_only_divisions(
    data: dict,
    current_user: dict = Depends(get_current_user),
):
    return await organization_service.set_staff_only_divisions(data, current_user)

@router.post("/org-config/features")
async def configure_features(
    features: dict,
    current_user: dict = Depends(get_current_user),
):
    return await organization_service.configure_features(features, current_user)

@router.get("/org-config/fiberzone-id")
async def get_fiberzone_division_id():
    return await organization_service.get_fiberzone_division_id()

@router.post("/org-config/initialize")
async def initialize_org_config(current_user: dict = Depends(get_current_user)):
    return await organization_service.initialize_org_config(current_user)
