import base64
import uuid
from datetime import datetime, timezone, timedelta
from typing import Optional, Any
from fastapi import HTTPException, UploadFile, Request

from database import db
from utils import (
    create_notification, verify_password, get_password_hash, create_access_token, send_email,
    get_org_config, get_staff_only_division_ids, get_division_by_name, 
    get_department_by_name, resolve_division_id_from_user, get_division_child_ids,
    validate_division_hierarchy, get_manager_for_division
)
from models import (
    User, UserCreate, UserLogin, VerifyLoginRequest, ForgotPasswordRequest,
    ResetPasswordRequest, UserProfileUpdate, AccountApprovalAction, UserResponse,
    TokenResponse, AuthToken, UserAccessLog
)

async def register(user_data: UserCreate):
    org_config = await get_org_config()
    allowed_domains = tuple(org_config.get("allowed_email_domains", ["@varnion.net.id", "@fiberzone.id"]))
    
    if not user_data.email.lower().endswith(allowed_domains):
        raise HTTPException(
            status_code=400, 
            detail=f"Only {', '.join(allowed_domains)} email addresses are allowed for registration"
        )
    
    existing_user = await db.users.find_one({"email": user_data.email}, {"_id": 0})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    staff_only_ids = await get_staff_only_division_ids()
    if user_data.division_id and user_data.division_id in staff_only_ids and user_data.role != "Staff":
        raise HTTPException(status_code=400, detail=f"Staff-only divisions can only register as Staff")
    
    if not user_data.department and not user_data.department_id:
        raise HTTPException(status_code=400, detail="Department is required")
    
    if not user_data.division and not user_data.division_id:
        raise HTTPException(status_code=400, detail="Division is required")
    
    dept_id = user_data.department_id
    dept_name = user_data.department
    if not dept_id and dept_name:
        dept = await get_department_by_name(dept_name)
        if not dept:
            raise HTTPException(status_code=400, detail=f"Department '{dept_name}' does not exist")
        dept_id = dept["id"]
    
    div_id = user_data.division_id
    div_name = user_data.division
    if not div_id and div_name:
        div = await get_division_by_name(div_name)
        if not div:
            raise HTTPException(status_code=400, detail=f"Division '{div_name}' does not exist")
        div_id = div["id"]
    
    division = await db.divisions.find_one({"id": div_id}, {"_id": 0})
    if not division:
        raise HTTPException(status_code=404, detail="Division not found")
    if division["department_id"] != dept_id:
        raise HTTPException(
            status_code=400,
            detail=f"Division does not belong to specified department"
        )
    
    if user_data.role != "VP" and not user_data.region:
        raise HTTPException(status_code=400, detail="Region is required for non-VP roles")
    
    user_region = None if user_data.role == "VP" else user_data.region
    
    account_status = "pending" if user_data.role in ["Staff", "SPV", "Manager"] else "approved"
    
    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        role=user_data.role,
        department=dept_name,
        division=div_name,
        department_id=dept_id,
        division_id=div_id,
        region=user_region,
        account_status=account_status
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    await db.users.insert_one(doc)
    
    if user_data.role in ["Staff", "SPV"] and div_id:
        config = await get_org_config()
        division_hierarchy = config.get("division_hierarchy", {})
        
        target_division_id = div_id
        for parent_id, children_ids in division_hierarchy.items():
            if div_id in children_ids:
                target_division_id = parent_id
                break
        
        manager = await get_manager_for_division(target_division_id)
        if manager:
            target_div = division
            if target_division_id != div_id:
                target_div = await db.divisions.find_one({"id": target_division_id}, {"_id": 0})
            
            await create_notification(
                user_id=manager["id"],
                title="New Person need Action",
                message=f"{user_data.username} Just Registered! ({user_data.role} - {div_name or division.get('name', 'N/A')}) Please take an Action",
                notification_type="account_approval",
                related_id=user.id
            )
    elif user_data.role == "Manager":
        vp_query = {"role": "VP", "account_status": "approved"}
        if dept_id:
            vp_query["department_id"] = dept_id
        vp = await db.users.find_one(vp_query, {"_id": 0})
        if vp:
            await create_notification(
                user_id=vp["id"],
                title="New Manager Has Been Registered",
                message=f"{user_data.username} (Manager - {dept_name or user_data.department}) has registered and needs action",
                notification_type="account_approval",
                related_id=user.id
            )
    
    return UserResponse(
        id=user.id,
        username=user.username,
        email=user.email,
        role=user.role,
        department=dept_name,
        division=div_name,
        department_id=dept_id,
        division_id=div_id,
        region=user.region,
        account_status=account_status,
        profile_photo=None,
        telegram_id=None
    )

async def login(credentials: UserLogin):
    user = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user or not verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if user.get("account_status") == "pending":
        raise HTTPException(status_code=403, detail="Account pending approval")
    if user.get("account_status") == "rejected":
        raise HTTPException(status_code=403, detail="Account has been rejected")

    if not user.get("two_factor_enabled", False):
        access_token = create_access_token(data={"sub": user["id"]})
        access_log = UserAccessLog(
            user_id=user["id"],
            user_name=user["username"],
            user_email=user["email"]
        )
        log_doc = access_log.model_dump()
        log_doc["access_time"] = log_doc["access_time"].isoformat()
        await db.user_access_logs.insert_one(log_doc)
        return {
            "status": "success",
            "access_token": access_token,
            "token_type": "bearer",
            "user": UserResponse(
                id=user["id"],
                username=user["username"],
                email=user["email"],
                role=user["role"],
                department=user.get("department"),
                division=user.get("division"),
                region=user.get("region"),
                account_status=user.get("account_status"),
                profile_photo=user.get("profile_photo"),
                telegram_id=user.get("telegram_id"),
                two_factor_enabled=user.get("two_factor_enabled", False)
            ).model_dump()
        }

    token_str = str(uuid.uuid4())
    token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    auth_token = AuthToken(
        user_id=user["id"],
        token=token_str,
        type="login",
        expires_at=token_expires_at
    )
    doc = auth_token.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['expires_at'] = doc['expires_at'].isoformat()
    await db.auth_tokens.insert_one(doc)

    settings = await db.site_settings.find_one({"id": "site_settings"})
    frontend_url = settings.get("frontend_url", "https://vlux.varnion.net.id") if settings else "https://vlux.varnion.net.id"
    if frontend_url.endswith('/'):
        frontend_url = frontend_url[:-1]

    verify_link = f"{frontend_url}/verify-login?token={token_str}"
    
    html_body = f"""
    <html>
      <body>
        <h2>Secure Login to Vlux</h2>
        <p>Click the link below to complete your login. This link will expire in 10 minutes.</p>
        <p><a href="{verify_link}" style="display:inline-block;padding:10px 20px;background-color:#3b82f6;color:white;text-decoration:none;border-radius:5px;">Verify Login</a></p>
        <p>If you did not attempt to log in, please ignore this email.</p>
      </body>
    </html>
    """
    await send_email(user["email"], "Vlux - Verify your Login", html_body)

    return {"status": "2fa_required", "email": user["email"]}

async def verify_login(payload: VerifyLoginRequest):
    token_doc = await db.auth_tokens.find_one({"token": payload.token, "type": "login", "used": False})
    if not token_doc:
        raise HTTPException(status_code=400, detail="Login link expired or invalid.")

    if datetime.fromisoformat(token_doc["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Login link expired or invalid.")

    await db.auth_tokens.update_one({"_id": token_doc["_id"]}, {"$set": {"used": True}})

    user = await db.users.find_one({"id": token_doc["user_id"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    access_token = create_access_token(data={"sub": user["id"]})
    access_log = UserAccessLog(
        user_id=user["id"],
        user_name=user["username"],
        user_email=user["email"]
    )
    log_doc = access_log.model_dump()
    log_doc["access_time"] = log_doc["access_time"].isoformat()
    await db.user_access_logs.insert_one(log_doc)
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(
            id=user["id"],
            username=user["username"],
            email=user["email"],
            role=user["role"],
            department=user.get("department"),
            division=user.get("division"),
            region=user.get("region"),
            account_status=user.get("account_status"),
            profile_photo=user.get("profile_photo"),
            telegram_id=user.get("telegram_id"),
            two_factor_enabled=user.get("two_factor_enabled", False)
        )
    )

async def forgot_password(payload: ForgotPasswordRequest):
    user = await db.users.find_one({"email": payload.email}, {"_id": 0})
    if not user:
        return {"message": "If that email is in our system, a reset link has been sent."}

    token_str = str(uuid.uuid4())
    token_expires_at = datetime.now(timezone.utc) + timedelta(minutes=60)
    auth_token = AuthToken(
        user_id=user["id"],
        token=token_str,
        type="reset",
        expires_at=token_expires_at
    )
    doc = auth_token.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['expires_at'] = doc['expires_at'].isoformat()
    await db.auth_tokens.insert_one(doc)

    settings = await db.site_settings.find_one({"id": "site_settings"})
    frontend_url = settings.get("frontend_url", "https://vlux.varnion.net.id") if settings else "https://vlux.varnion.net.id"
    if frontend_url.endswith('/'):
        frontend_url = frontend_url[:-1]

    reset_link = f"{frontend_url}/reset-password?token={token_str}"
    
    html_body = f"""
    <html>
      <body>
        <h2>Reset Your Password</h2>
        <p>Click the link below to reset your password. This link will expire in 60 minutes.</p>
        <p><a href="{reset_link}" style="display:inline-block;padding:10px 20px;background-color:#3b82f6;color:white;text-decoration:none;border-radius:5px;">Reset Password</a></p>
        <p>If you did not request a password reset, please ignore this email.</p>
      </body>
    </html>
    """
    await send_email(user["email"], "Vlux - Password Reset Request", html_body)

    return {"message": "If that email is in our system, a reset link has been sent."}

async def reset_password(payload: ResetPasswordRequest):
    token_doc = await db.auth_tokens.find_one({"token": payload.token, "type": "reset", "used": False})
    if not token_doc:
        raise HTTPException(status_code=400, detail="Reset link expired or invalid.")

    if datetime.fromisoformat(token_doc["expires_at"]) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset link expired or invalid.")

    password_hash = get_password_hash(payload.new_password)
    await db.users.update_one(
        {"id": token_doc["user_id"]},
        {"$set": {"password_hash": password_hash}}
    )

    await db.auth_tokens.update_one({"_id": token_doc["_id"]}, {"$set": {"used": True}})

    return {"message": "Password has been successfully reset."}

async def get_me(current_user: dict):
    dept_name = current_user.get("department")
    div_name = current_user.get("division")
    
    if current_user.get("department_id"):
        dept = await db.departments.find_one({"id": current_user["department_id"]}, {"name": 1})
        if dept: 
            dept_name = dept["name"]
        
    if current_user.get("division_id"):
        div = await db.divisions.find_one({"id": current_user["division_id"]}, {"name": 1})
        if div: 
            div_name = div["name"]

    return UserResponse(
        id=current_user["id"],
        username=current_user["username"],
        email=current_user["email"],
        role=current_user["role"],
        department=dept_name,
        division=div_name,
        department_id=current_user.get("department_id"),
        division_id=current_user.get("division_id"),
        region=current_user.get("region"),
        account_status=current_user.get("account_status"),
        profile_photo=current_user.get("profile_photo"),
        telegram_id=current_user.get("telegram_id"),
        two_factor_enabled=current_user.get("two_factor_enabled", False)
    )

async def update_profile(profile_data: UserProfileUpdate, current_user: dict):
    update_dict: dict[str, Any] = {}
    if profile_data.username:
        update_dict["username"] = profile_data.username
    if profile_data.telegram_id is not None:
        update_dict["telegram_id"] = profile_data.telegram_id
    if profile_data.two_factor_enabled is not None:
        update_dict["two_factor_enabled"] = profile_data.two_factor_enabled
    if profile_data.new_password:
        if not profile_data.current_password or not profile_data.confirm_password:
            raise HTTPException(status_code=400, detail="Current password and confirmation required")
        if not verify_password(profile_data.current_password, current_user["password_hash"]):
            raise HTTPException(status_code=400, detail="Current password is incorrect")
        if profile_data.new_password != profile_data.confirm_password:
            raise HTTPException(status_code=400, detail="Passwords do not match")
        update_dict["password_hash"] = get_password_hash(profile_data.new_password)
    if update_dict:
        await db.users.update_one(
            {"id": current_user["id"]},
            {"$set": update_dict}
        )
    return {"message": "Profile updated successfully"}

async def upload_profile_photo(photo: UploadFile, current_user: dict):
    file_content = await photo.read()
    photo_data = base64.b64encode(file_content).decode('utf-8')
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"profile_photo": photo_data}}
    )
    return {"message": "Profile photo updated successfully", "photo_data": photo_data}

async def get_pending_accounts(current_user: dict):
    if current_user["role"] not in ["Manager", "VP", "SuperUser"]:
        raise HTTPException(status_code=403, detail="Only managers, VP and SuperUser can view pending accounts")
    
    is_admin = False
    if current_user.get("division_id"):
        div = await db.divisions.find_one({"id": current_user["division_id"]}, {"_id": 0})
        is_admin = div.get("is_admin_division", False) if div else False
    
    if is_admin:
        return []
    
    if current_user["role"] == "Manager":
        query = {"account_status": "pending"}
        user_division_id = current_user.get("division_id") or (
            (await get_division_by_name(current_user.get("division")))["id"] 
            if current_user.get("division") else None
        )
        
        division_filter_ids = [user_division_id] if user_division_id else []
        
        if user_division_id:
            child_ids = await get_division_child_ids(user_division_id)
            division_filter_ids.extend(child_ids)
        
        if division_filter_ids:
            query["$or"] = [
                {"division_id": {"$in": division_filter_ids}},
                {"division": {"$in": [d.get("name") if isinstance(d, dict) else d for d in division_filter_ids]}}
            ]
        
        query["role"] = {"$ne": "Manager"}
        
        if current_user.get("region"):
            query["region"] = current_user.get("region")
    
    elif current_user["role"] == "VP":
        query = {"account_status": "pending", "role": "Manager"}
        
        vp_dept_id = current_user.get("department_id")
        if not vp_dept_id and current_user.get("department"):
            dept = await get_department_by_name(current_user["department"])
            vp_dept_id = dept["id"] if dept else None
        
        if vp_dept_id:
            query["$or"] = [
                {"department_id": vp_dept_id},
                {"department": current_user.get("department")}
            ]
    else:
        query = {"account_status": "pending"}
    
    pending_users = await db.users.find(query, {"_id": 0, "password_hash": 0}).to_list(1000)
    return pending_users

async def review_account(action_data: AccountApprovalAction, current_user: dict):
    if current_user["role"] not in ["Manager", "VP", "SuperUser"]:
        raise HTTPException(status_code=403, detail="Only managers, VP and SuperUser can review accounts")
    
    is_admin = False
    if current_user.get("division_id"):
        div = await db.divisions.find_one({"id": current_user["division_id"]}, {"_id": 0})
        is_admin = div.get("is_admin_division", False) if div else False
    
    if is_admin and current_user["role"] != "SuperUser":
        raise HTTPException(status_code=403, detail="Users in Admin division cannot perform staff approvals")
    
    user = await db.users.find_one({"id": action_data.user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if current_user["role"] == "Manager":
        user_division_id = current_user.get("division_id") or (
            (await get_division_by_name(current_user.get("division")))["id"] 
            if current_user.get("division") else None
        )
        target_user_division_id = user.get("division_id") or (
            (await get_division_by_name(user.get("division")))["id"] 
            if user.get("division") else None
        )
        
        allowed = await validate_division_hierarchy(user_division_id, target_user_division_id)
        
        if not allowed:
            raise HTTPException(status_code=403, detail="Can only review accounts from your division or its sub-divisions")
        
        user_region = current_user.get("region")
        target_user_region = user.get("region")
        if user_region and target_user_region and user_region != target_user_region:
            raise HTTPException(status_code=403, detail="Can only review accounts from your region")
        
        if user.get("role") == "Manager":
            raise HTTPException(status_code=403, detail="Managers cannot review other Manager accounts")
        
        new_status = "approved" if action_data.action == "approve" else "rejected"
    
    elif current_user["role"] == "VP":
        new_status = "approved" if action_data.action == "approve" else "rejected"
        
        vp_dept_id = current_user.get("department_id") or (
            (await get_department_by_name(current_user.get("department")))["id"]
            if current_user.get("department") else None
        )
        target_dept_id = user.get("department_id") or (
            (await get_department_by_name(user.get("department")))["id"]
            if user.get("department") else None
        )
        
        if vp_dept_id and target_dept_id and vp_dept_id != target_dept_id:
            raise HTTPException(status_code=403, detail="VP can only review accounts from their own department")
    
    elif current_user["role"] == "SuperUser":
        new_status = "approved" if action_data.action == "approve" else "rejected"
    else:
        raise HTTPException(status_code=403, detail="Invalid role for account review")
    
    await db.users.update_one(
        {"id": action_data.user_id},
        {"$set": {"account_status": new_status}}
    )
    
    await create_notification(
        user_id=action_data.user_id,
        title=f"Your Account {new_status.capitalize()}",
        message=f"Your account has been {new_status} by {current_user['username']}",
        notification_type="account_status"
    )
    return {"message": f"Account {new_status}"}
