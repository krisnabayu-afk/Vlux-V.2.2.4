from fastapi import APIRouter, Depends, UploadFile, File, Request
from typing import List

from utils import get_current_user
from models import (
    UserResponse, UserCreate, UserLogin, TokenResponse, VerifyLoginRequest,
    ForgotPasswordRequest, ResetPasswordRequest, UserProfileUpdate, AccountApprovalAction
)
from services import auth_service

router = APIRouter()

@router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    return await auth_service.register(user_data)

@router.post("/auth/login")
async def login(credentials: UserLogin, request: Request):
    return await auth_service.login(credentials)

@router.post("/auth/verify-login", response_model=TokenResponse)
async def verify_login(payload: VerifyLoginRequest, request: Request):
    return await auth_service.verify_login(payload)

@router.post("/auth/forgot-password")
async def forgot_password(payload: ForgotPasswordRequest):
    return await auth_service.forgot_password(payload)

@router.post("/auth/reset-password")
async def reset_password(payload: ResetPasswordRequest):
    return await auth_service.reset_password(payload)

@router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    return await auth_service.get_me(current_user)

@router.put("/auth/profile")
async def update_profile(profile_data: UserProfileUpdate, current_user: dict = Depends(get_current_user)):
    return await auth_service.update_profile(profile_data, current_user)

@router.post("/auth/profile/photo")
async def upload_profile_photo(
    photo: UploadFile = File(...),
    current_user: dict = Depends(get_current_user)
):
    return await auth_service.upload_profile_photo(photo, current_user)

@router.get("/accounts/pending")
async def get_pending_accounts(current_user: dict = Depends(get_current_user)):
    return await auth_service.get_pending_accounts(current_user)

@router.post("/accounts/review")
async def review_account(action_data: AccountApprovalAction, current_user: dict = Depends(get_current_user)):
    return await auth_service.review_account(action_data, current_user)
