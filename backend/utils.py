import base64
import os
import uuid
import asyncio
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime, timezone, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt
from passlib.context import CryptContext
import requests

from database import db, SECRET_KEY, ALGORITHM, TELEGRAM_BOT_TOKEN, ACCESS_TOKEN_EXPIRE_MINUTES

logger = logging.getLogger(__name__)

async def send_email(to_email: str, subject: str, html_body: str):
    """
    Sends an email using the internal SMTP relay.
    Host: 103.23.202.10
    Port: 25
    No Auth, No Encryption
    """
    smtp_host = "smtp.varnion.net"
    smtp_port = 25
    from_email = "noreply@varnion.net"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email

    part = MIMEText(html_body, "html")
    msg.attach(part)

    def _send():
        print(f"--- Attempting to send email to {to_email} via {smtp_host}:{smtp_port} ---")
        try:
            with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as server:
                server.set_debuglevel(1)  # Enable verbose SMTP logging
                server.sendmail(from_email, to_email, msg.as_string())
            print(f"SUCCESS: Email sent successfully to {to_email}")
            logger.info(f"Email sent successfully to {to_email}")
        except Exception as e:
            print(f"ERROR: Failed to send email to {to_email}. Exception: {e}")
            logger.error(f"Failed to send email to {to_email}: {e}")
        print("--- Email attempt finished ---")

    # Run blocking SMTP call in a thread
    await asyncio.to_thread(_send)



pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

MONITORING_SHIFTS = {
    "Shift Pagi": {"start": "07:00", "end": "16:00", "next_day": False},
    "Shift Siang": {"start": "13:00", "end": "22:00", "next_day": False},
    "Shift Malam": {"start": "22:00", "end": "07:00", "next_day": True},
    "SOS": {"start": None, "end": None, "next_day": False},
}

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except Exception:
        raise credentials_exception
        
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise credentials_exception
    return user

async def get_current_admin(current_user: dict = Depends(get_current_user)):
    if current_user["role"] not in ["Admin", "SuperUser"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user doesn't have enough privileges"
        )
    return current_user

def is_tech_op_admin(user: dict):
    return user["role"] in ["Admin", "SuperUser"] and user.get("department") in ["Technical Operation", "Core Network & Access"]

def decode_base64_image(base64_string: str) -> Optional[bytes]:
    try:
        if "," in base64_string:
            base64_string = base64_string.split(",")[1]
        return base64.b64decode(base64_string)
    except Exception as e:
        logger.error(f"Error decoding base64 image: {e}")
        return None

async def send_telegram_message(chat_id: str, text: str):
    if not TELEGRAM_BOT_TOKEN:
        logger.warning("TELEGRAM_BOT_TOKEN not configured. Skipping telegram notification.")
        return
    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": "Markdown"
    }
    try:
        response = requests.post(url, json=payload, timeout=5)
        response.raise_for_status()
    except Exception as e:
        logger.error(f"Failed to send telegram message to {chat_id}: {e}")

async def create_notification(user_id: str, title: str, message: str, notification_type: str, related_id: Optional[str] = None):
    notification = {
        "id": str(uuid.uuid4()),
        "user_id": user_id,
        "title": title,
        "message": message,
        "type": notification_type,
        "related_id": related_id,
        "read": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.notifications.insert_one(notification)
    
    user = await db.users.find_one({"id": user_id})
    if user and user.get("telegram_id"):
        asyncio.create_task(send_telegram_message(user["telegram_id"], f"*{title}*\n{message}"))


# ============ RBAC: BACKEND can_edit ENFORCEMENT ============

# Roles that are always unrestricted and bypass permission checks
UNRESTRICTED_ROLES = {"SuperUser"}


def require_can_edit(menu_key: str):
    """
    FastAPI dependency factory.
    Usage: current_user: dict = Depends(require_can_edit("reports"))

    Raises HTTP 403 if the current user's department has can_edit=False
    for the given menu_key.

    - SuperUser is always allowed.
    - If no permission row exists for the department, defaults to allow (True).
    """
    async def _check(current_user: dict = Depends(get_current_user)) -> dict:
        # Unrestricted roles bypass all checks
        if current_user.get("role") in UNRESTRICTED_ROLES:
            return current_user

        # Special check for Admin Division (Tech Ops)
        if await is_admin_tech_ops(current_user):
            return current_user

        dept_name = current_user.get("department")
        if not dept_name:
            return current_user  # No department — allow (edge case)

        # Look up department id
        dept = await db.departments.find_one({"name": dept_name}, {"_id": 0})
        if not dept:
            return current_user  # Unknown department — allow

        # Look up the specific permission row
        perm = await db.department_permissions.find_one(
            {"department_id": dept["id"], "menu_key": menu_key},
            {"_id": 0}
        )

        # Default: allow if no row configured
        if perm is None:
            return current_user

        if perm.get("can_edit") is False:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Your department does not have edit access to '{menu_key}'."
            )

        return current_user

    return _check


# ============ NEW: DYNAMIC DIVISION/DEPARTMENT HELPERS ============
# These functions replace hardcoded division string lookups with ID-based queries

async def get_division_by_name(division_name: str) -> Optional[dict]:
    """Resolve a division name to its database document"""
    return await db.divisions.find_one({"name": division_name}, {"_id": 0})


async def get_division_by_id(division_id: str) -> Optional[dict]:
    """Get a division document by ID"""
    return await db.divisions.find_one({"id": division_id}, {"_id": 0})


async def get_department_by_name(dept_name: str) -> Optional[dict]:
    """Resolve a department name to its database document"""
    return await db.departments.find_one({"name": dept_name}, {"_id": 0})


async def get_department_by_id(dept_id: str) -> Optional[dict]:
    """Get a department document by ID"""
    return await db.departments.find_one({"id": dept_id}, {"_id": 0})


async def get_org_config() -> dict:
    """Get organization configuration (creates default if not exists)"""
    config = await db.org_config.find_one({"id": "org_config"}, {"_id": 0})
    if not config:
        # Return minimal default config
        from models import OrganizationConfig
        default = OrganizationConfig()
        return default.model_dump()
    return config


async def get_fiberzone_division_id() -> Optional[str]:
    """Get Fiberzone division ID from org config - replaces hardcoded "Fiberzone" string"""
    config = await get_org_config()
    return config.get("division_mappings", {}).get("fiberzone_division_id")


async def get_staff_only_division_ids() -> list:
    """Get list of staff-only division IDs - replaces hardcoded ["Apps", "Fiberzone"] list"""
    config = await get_org_config()
    return config.get("staff_only_division_ids", [])


async def get_sales_department_id() -> Optional[str]:
    """Get Sales department ID from org config"""
    config = await get_org_config()
    return config.get("division_mappings", {}).get("sales_department_id")


async def get_tech_ops_department_id() -> Optional[str]:
    """Get Technical Operations department ID from org config"""
    config = await get_org_config()
    return config.get("division_mappings", {}).get("tech_ops_department_id")


async def is_admin_tech_ops(user: dict) -> bool:
    """Check if a user belongs to the mapped Admin Division for Tech Ops"""
    config = await get_org_config()
    admin_div_id = config.get("division_mappings", {}).get("admin_division_id")
    if not admin_div_id:
        return False
    
    # Check if user's division matches the mapped admin division
    user_div_id = await resolve_division_id_from_user(user)
    return user_div_id == admin_div_id


async def is_sales_user(user: dict) -> bool:
    """Check if a user belongs to the Sales department (dynamic)"""
    sales_id = await get_sales_department_id()
    if sales_id and user.get("department_id") == sales_id:
        return True
    return user.get("department") == "Sales"  # Fallback


async def can_division_have_manager(division_id: str) -> bool:
    """Check if a division can have Manager role"""
    division = await get_division_by_id(division_id)
    if not division:
        return False
    return division.get("is_manager_division", True)


async def is_division_staff_only(division_id: str) -> bool:
    """Check if a division is restricted to Staff role"""
    staff_only_ids = await get_staff_only_division_ids()
    return division_id in staff_only_ids


async def get_division_parent_id(division_id: str) -> Optional[str]:
    """Get the parent division ID (e.g., Apps' parent is TS)"""
    division = await get_division_by_id(division_id)
    if not division:
        return None
    return division.get("parent_division_id")


async def get_division_child_ids(division_id: str) -> list:
    """Get child division IDs (e.g., TS has children ["Apps"])"""
    division = await get_division_by_id(division_id)
    if not division:
        return []
    return division.get("child_division_ids", [])


async def get_concatenated_divisions(concat_label: str) -> list:
    """
    Get division IDs for a concatenation filter
    E.g., "Infra & Fiberzone" returns ["infra_id", "fiberzone_id"]
    """
    config = await get_org_config()
    concatenations = config.get("division_concatenations", {})
    return concatenations.get(concat_label, [])


async def get_manager_for_division(division_id: str) -> Optional[dict]:
    """Get an approved Manager user for a specific division"""
    return await db.users.find_one(
        {
            "role": "Manager",
            "division_id": division_id,
            "account_status": "approved",
        },
        {"_id": 0},
    )


async def get_manager_by_division_name(division_name: str) -> Optional[dict]:
    """Get an approved Manager user by division name (legacy support)"""
    return await db.users.find_one(
        {
            "role": "Manager",
            "division": division_name,
            "account_status": "approved",
        },
        {"_id": 0},
    )


async def validate_division_hierarchy(user_division_id: str, target_division_id: str) -> bool:
    """
    Check if user's division can manage target division
    E.g., TS can manage Apps
    Returns True if they're the same or user manages target
    """
    if not user_division_id or not target_division_id:
        return False

    if user_division_id == target_division_id:
        return True
    
    # 1. Check Division collection (child_division_ids field)
    child_ids = await get_division_child_ids(user_division_id)
    if target_division_id in (child_ids or []):
        return True
    
    # 2. Check Organization Config hierarchy (source of truth for global overrides)
    config = await get_org_config()
    hierarchy = config.get("division_hierarchy", {})
    if user_division_id in hierarchy and target_division_id in hierarchy[user_division_id]:
        return True
    
    # 3. Fallback: name-based hierarchy (TS → Apps, Infra → Fiberzone)
    user_div = await get_division_by_id(user_division_id)
    target_div = await get_division_by_id(target_division_id)
    if user_div and target_div:
        user_name = user_div.get("name", "")
        target_name = target_div.get("name", "")
        if user_name == "TS" and target_name == "Apps":
            return True
        if user_name == "Infra" and target_name == "Fiberzone":
            return True
        
    return False


async def resolve_division_id_from_user(user: dict) -> Optional[str]:
    """
    Resolve a user's division to an ID
    Tries division_id first, then looks up division by name
    """
    if user.get("division_id"):
        return user.get("division_id")
    
    if user.get("division"):
        div = await get_division_by_name(user["division"])
        return div["id"] if div else None
    
    return None


async def get_divisions_allowed_for_role(role: str, division_ids: Optional[list] = None) -> list:
    """
    Get divisions a user with a specific role can be assigned to
    If division_ids provided, filter to those
    """
    config = await get_org_config()
    staff_only_ids = config.get("staff_only_division_ids", [])
    
    if division_ids is None:
        # Get all active divisions
        divisions = await db.divisions.find(
            {"status": "active"}, {"_id": 0, "id": 1, "name": 1}
        ).to_list(None)
        division_ids = [d["id"] for d in divisions]
    
    if role == "Staff":
        # Staff can only be in staff-only or regular divisions
        return division_ids  # Can be in any division
    
    elif role == "SPV" or role == "Manager":
        # Manager/SPV cannot be in staff-only divisions
        return [d for d in division_ids if d not in staff_only_ids]
    
    # VP can be in any division
    return division_ids


async def sync_division_string_to_id(user_doc: dict) -> dict:
    """
    Helper to migrate user from string-based division to ID-based
    If division_id is missing but division string exists, look up ID
    """
    if not user_doc.get("division_id") and user_doc.get("division"):
        div = await get_division_by_name(user_doc["division"])
        if div:
            user_doc["division_id"] = div["id"]
    
    if not user_doc.get("department_id") and user_doc.get("department"):
        dept = await get_department_by_name(user_doc["department"])
        if dept:
            user_doc["department_id"] = dept["id"]
    
    return user_doc

