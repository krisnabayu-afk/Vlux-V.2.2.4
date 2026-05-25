from pydantic import BaseModel, ConfigDict, Field
from typing import List, Optional, Any, Dict
from datetime import datetime, timezone
import uuid

# ============ DIVISION CONFIGURATION MODELS ============

class Division(BaseModel):
    """Dynamic Division configuration - replaces hardcoded division strings"""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    department_id: str  # Reference to Department
    display_name: Optional[str] = None  # For display purposes (e.g., "Fiberzone" can show as "FZ-Tech")
    description: Optional[str] = None
    # Special configuration flags
    is_staff_only: bool = False  # If true, only Staff role allowed (e.g., Apps, Fiberzone)
    is_manager_division: bool = True  # If true, can have Manager role
    is_admin_division: bool = False  # If true, this is an admin/special division
    # Hierarchy - for approval workflows
    parent_division_id: Optional[str] = None  # e.g., "Apps" parent is "TS"
    child_division_ids: List[str] = []  # e.g., "TS" children include "Apps"
    # Concatenation support - for multi-division filters
    concatenated_divisions: List[str] = []  # IDs of divisions to include when filtering (e.g., "Infra & Fiberzone")
    # Fiberzone flag
    is_fiberzone: bool = False
    # Email domain whitelist
    allowed_email_domains: List[str] = []  # e.g., ["@fiberzone.id"]
    status: str = "active"  # active, inactive
    display_order: int = 0  # For UI ordering
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DivisionCreate(BaseModel):
    name: str
    department_id: str
    display_name: Optional[str] = None
    description: Optional[str] = None
    is_staff_only: Optional[bool] = False
    is_manager_division: Optional[bool] = True
    is_admin_division: Optional[bool] = False
    parent_division_id: Optional[str] = None
    child_division_ids: Optional[List[str]] = []
    concatenated_divisions: Optional[List[str]] = []
    is_fiberzone: Optional[bool] = False
    allowed_email_domains: Optional[List[str]] = []
    display_order: Optional[int] = 0

class DivisionUpdate(BaseModel):
    name: Optional[str] = None
    display_name: Optional[str] = None
    description: Optional[str] = None
    is_staff_only: Optional[bool] = None
    is_manager_division: Optional[bool] = None
    is_admin_division: Optional[bool] = None
    parent_division_id: Optional[str] = None
    child_division_ids: Optional[List[str]] = None
    concatenated_divisions: Optional[List[str]] = None
    is_fiberzone: Optional[bool] = None
    allowed_email_domains: Optional[List[str]] = None
    status: Optional[str] = None
    display_order: Optional[int] = None

# ============ DEPARTMENT MODELS ============

class Department(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    # Keep legacy divisions list for backward compatibility
    divisions: List[str] = []
    # Add ID-based divisions list
    division_ids: List[str] = Field(default_factory=list)  # NEW: List of Division.id references
    description: Optional[str] = None
    status: str = "active"  # active, inactive
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DepartmentCreate(BaseModel):
    name: str
    divisions: List[str] = []
    description: Optional[str] = None

class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    divisions: Optional[List[str]] = None
    description: Optional[str] = None

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: str
    password_hash: str
    role: str
    # Legacy: Keep string references for backward compatibility
    department: Optional[str] = None  # DEPARTMENT: e.g. "Technical Operation"
    division: Optional[str] = None
    # NEW: ID-based references (preferred)
    department_id: Optional[str] = None  # Reference to Department.id
    division_id: Optional[str] = None  # Reference to Division.id
    region: Optional[str] = None  # REGIONAL: Region 1, Region 2, Region 3
    account_status: str = "pending"  # NEW: pending, approved, rejected
    profile_photo: Optional[str] = None  # NEW: Base64 encoded photo
    telegram_id: Optional[str] = None  # NEW: Telegram Chat ID
    two_factor_enabled: bool = False  # NEW: 2FA Toggle
    is_project_leader: bool = False  # NEW: Project Leader Designation
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    role: str
    # Support both legacy string and new ID-based assignment
    department: Optional[str] = None  # DEPARTMENT: e.g. "Technical Operation"
    division: Optional[str] = None
    department_id: Optional[str] = None  # NEW: Can use ID directly
    division_id: Optional[str] = None  # NEW: Can use ID directly
    region: Optional[str] = None  # REGIONAL: Required for non-VP roles


class UserLogin(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    role: str
    # Legacy fields
    department: Optional[str] = None  # DEPARTMENT
    division: Optional[str] = None
    # NEW: ID-based fields
    department_id: Optional[str] = None
    division_id: Optional[str] = None
    region: Optional[str] = None  # REGIONAL
    account_status: Optional[str] = None
    profile_photo: Optional[str] = None
    telegram_id: Optional[str] = None
    two_factor_enabled: Optional[bool] = False
    is_project_leader: Optional[bool] = False


class UserProfileUpdate(BaseModel):  # NEW
    username: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None
    confirm_password: Optional[str] = None
    telegram_id: Optional[str] = None
    two_factor_enabled: Optional[bool] = None


class UserUpdateAdmin(BaseModel):  # NEW: Admin update model
    role: Optional[str] = None
    department: Optional[str] = None  # DEPARTMENT (legacy)
    division: Optional[str] = None  # (legacy)
    department_id: Optional[str] = None  # NEW: ID-based
    division_id: Optional[str] = None  # NEW: ID-based
    region: Optional[str] = None
    account_status: Optional[str] = None
    two_factor_enabled: Optional[bool] = None
    is_project_leader: Optional[bool] = None


class AccountApprovalAction(BaseModel):  # NEW
    user_id: str
    action: str  # approve or reject


class TokenResponse(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse
# NEW: Site Model
class Site(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    cid: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    region: Optional[str] = None  # REGIONAL: Region 1, Region 2, Region 3
    status: str = "active"  # active, inactive
    fiberzone: bool = False
    btest_link: Optional[str] = None
    fiberlink_link: Optional[str] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
class SiteCreate(BaseModel):
    name: str
    cid: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    region: Optional[str] = None  # REGIONAL
    fiberzone: bool = False
    btest_link: Optional[str] = None
    fiberlink_link: Optional[str] = None
class SiteUpdate(BaseModel):
    name: Optional[str] = None
    cid: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    region: Optional[str] = None  # REGIONAL
    status: Optional[str] = None
    fiberzone: Optional[bool] = None
    btest_link: Optional[str] = None
    fiberlink_link: Optional[str] = None
# NEW: Activity Category Model
class ActivityCategory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
class CategoryCreate(BaseModel):
    name: str
class Schedule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    division: str
    division_id: Optional[str] = None  # NEW: Division ID for mapping
    category_id: Optional[str] = None  # NEW: Activity category
    category_name: Optional[str] = None  # NEW: Activity category name
    title: str
    description: Optional[str] = None
    start_date: datetime
    end_date: Optional[datetime] = None
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    ticket_id: Optional[str] = None
    site_id: Optional[str] = None  # NEW
    site_name: Optional[str] = None  # NEW
    site_region: Optional[str] = None  # REGIONAL: Denormalized for filtering
    # NOTIFICATION FLAGS: Prevent duplicate notifications
    notified_1h_before_start: bool = False
    notified_30m_before_end: bool = False
    auto_finished: bool = False
    product: Optional[str] = None
class ScheduleCreate(BaseModel):
    user_ids: List[str]  # Changed from user_id to user_ids for bulk assignment
    division: Optional[str] = None # Made optional for bulk assignment
    division_id: Optional[str] = None # NEW: Division ID for mapping
    category_id: Optional[str] = None  # NEW: Activity category
    title: str
    description: Optional[str] = None
    start_date: str
    end_date: Optional[str] = None
    ticket_id: Optional[str] = None
    site_id: str  # Required
    product: str  # Required
class ScheduleUpdate(BaseModel):
    user_id: Optional[str] = None
    user_name: Optional[str] = None
    category_id: Optional[str] = None  # NEW: Activity category
    title: Optional[str] = None
    description: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    site_id: Optional[str] = None  # NEW
    product: Optional[str] = None  # NEW
# NEW: Activity Models
class Activity(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    schedule_id: str
    user_id: str
    user_name: str
    division: str
    action_type: str  # start, finish, cancel, hold
    status: str  # In Progress, Finished, Cancelled, On Hold
    notes: Optional[str] = None
    reason: Optional[str] = None  # Required for cancel
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    progress_updates: List[dict] = []  # NEW: Array of timestamped progress updates
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
class ActivityCreate(BaseModel):
    schedule_id: str
    action_type: str  # start, finish, cancel, hold
    notes: Optional[str] = None
    reason: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None  # Required when action_type is cancel
class ActivityProgressUpdate(BaseModel):
    activity_id: str
    update_text: str  # The progress update/comment
class AutoPushUpdateQuery(BaseModel):
    activity_id: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
# NEW: Shift Change Request
class ShiftChangeRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    schedule_id: str
    requested_by: str
    requested_by_name: str
    reason: str
    new_start_date: datetime
    new_end_date: datetime
    status: str = "pending"  # pending, approved, rejected
    reviewed_by: Optional[str] = None
    review_comment: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
class ShiftChangeRequestCreate(BaseModel):
    schedule_id: str
    reason: str
    new_start_date: str
    new_end_date: str
class ShiftChangeReviewAction(BaseModel):
    request_id: str
    action: str  # approve or reject
    comment: Optional[str] = None
class CommentCreate(BaseModel):
    text: str
class Comment(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    text: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
class Report(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    category_id: Optional[str] = None  # NEW: Activity category
    category_name: Optional[str] = None  # NEW: Activity category name
    title: str
    description: Optional[str] = None
    file_name: str
    file_data: Optional[str] = None
    file_url: Optional[str] = None # NEW
    file_2_name: Optional[str] = None # NEW: Second file
    file_2_data: Optional[str] = None
    file_2_url: Optional[str] = None
    status: str
    submitted_by: str
    submitted_by_name: str
    current_approver: Optional[str] = None
    department: Optional[str] = None  # DEPARTMENT: Denormalized from submitter
    department_id: Optional[str] = None  # NEW: Department ID for mapping
    division_id: Optional[str] = None  # NEW: Division ID for mapping
    ticket_id: Optional[str] = None
    site_id: Optional[str] = None  # NEW
    site_name: Optional[str] = None  # NEW
    site_region: Optional[str] = None  # REGIONAL: Denormalized for filtering
    version: int = 1
    rejection_comment: Optional[str] = None
    comments: List[Comment] = []
    # RATING: Performance scoring fields
    manager_rating: Optional[int] = None   # 1-5 stars from Manager
    manager_notes: Optional[str] = None    # Feedback from Manager
    vp_rating: Optional[int] = None        # 1-5 stars from VP
    vp_notes: Optional[str] = None         # Feedback from VP
    final_score: Optional[float] = None    # Average of manager + vp ratings
    can_approve: Optional[bool] = None     # Backend-calculated approval permission
    can_cancel_approval: Optional[bool] = None # Backend-calculated cancel approval permission
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
class ApprovalAction(BaseModel):
    report_id: str
    action: str
    comment: Optional[str] = None
    rating: Optional[int] = None   # 1-5 stars (required for approve action by Manager/VP)
    notes: Optional[str] = None    # Optional feedback from approver
class CancelApprovalRequest(BaseModel):
    report_id: str
class ReportUpdate(BaseModel):
    category_id: Optional[str] = None  # NEW: Activity category
    title: Optional[str] = None
    description: Optional[str] = None
    site_id: Optional[str] = None
    ticket_id: Optional[str] = None
class PaginatedReportResponse(BaseModel):
    items: List[Report]
    total: int
    page: int
    limit: int
    total_pages: int
class PaginatedSiteResponse(BaseModel):
    items: List[Site]
    total: int
    page: int
    limit: int
    total_pages: int
class Ticket(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: Optional[str] = None
    description: str
    priority: str
    status: str
    assigned_to_division: str
    assigned_to_division_id: Optional[str] = None  # NEW: Division ID for mapping
    assigned_to: Optional[str] = None
    created_by: str
    created_by_name: str
    linked_report_id: Optional[str] = None
    site_id: Optional[str] = None  # NEW
    site_name: Optional[str] = None  # NEW
    site_region: Optional[str] = None  # REGIONAL: Denormalized for filtering
    ticket_number: Optional[str] = None  # NEW: Hyperlink enabled
    link: Optional[str] = None  # NEW: Separate link field
    category: Optional[str] = None  # NEW: Dropdown
    region: Optional[str] = None  # NEW: Consistent with Signup/Schedule
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    comments: List[dict] = []
    latest_comment: Optional[str] = None
class PaginatedTicketResponse(BaseModel):
    items: List[Ticket]
    total: int
    page: int
    limit: int
    total_pages: int
class TicketCreate(BaseModel):
    title: Optional[str] = None
    description: str
    assigned_to_division: str
    assigned_to_division_id: Optional[str] = None
    site_id: Optional[str] = None
    ticket_number: Optional[str] = None
    link: Optional[str] = None
    category: Optional[str] = None
    next_action: Optional[str] = None
class TicketUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    assigned_to_division: Optional[str] = None
    assigned_to_division_id: Optional[str] = None
    assigned_to: Optional[str] = None
    site_id: Optional[str] = None
    ticket_number: Optional[str] = None
    link: Optional[str] = None
    category: Optional[str] = None
class TicketComment(BaseModel):
    ticket_id: str
    comment: str
class Notification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    message: str
    type: str
    related_id: Optional[str] = None
    read: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
class Holiday(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    start_date: str  # YYYY-MM-DD
    end_date: str    # YYYY-MM-DD
    description: str
    is_recurring: bool = False
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
class HolidayCreate(BaseModel):
    start_date: str
    end_date: Optional[str] = None
    description: str
    is_recurring: bool = False
class VersionUpdate(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    version: str  # e.g., "Flux Version 1.1"
    changes: List[str]  # e.g., ["add schedule"]
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
class VersionUpdateCreate(BaseModel):
    version: str
    changes: List[str]
# ============ FEEDBACK MODELS ============
class Feedback(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    user_role: str
    title: str
    description: str
    status: str = "Open"  # Open or Closed
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
class FeedbackCreate(BaseModel):
    title: str
    description: str
class FeedbackStatusUpdate(BaseModel):
    status: str  # Open or Closed
class FeedbackComment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    feedback_id: str
    user_id: str
    user_name: str
    user_role: str
    content: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
class FeedbackCommentCreate(BaseModel):
    content: str
# ============ CERTIFICATION MODELS ============
class UserCertification(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    title: str
    date_taken: str  # YYYY-MM-DD
    description: Optional[str] = None
    pdf_path: Optional[str] = None
    pdf_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
class UserCertificationCreate(BaseModel):
    title: str
    date_taken: str
    description: Optional[str] = None
# ============ STARLINK MODELS ============
class Starlink(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    sn: str
    position: str # Location/Site
    account_email: str
    package_status: str # Linked Account & Current Package Name
    expiration_date: datetime
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
class StarlinkCreate(BaseModel):
    name: str
    sn: str
    position: str
    account_email: str
    package_status: str
    expiration_date: str # Expecting ISO string or YYYY-MM-DD
class StarlinkUpdate(BaseModel):
    name: Optional[str] = None
    sn: Optional[str] = None
    position: Optional[str] = None
    account_email: Optional[str] = None
    package_status: Optional[str] = None
    expiration_date: Optional[str] = None
# ============ TTB (Document Archive) MODELS ============
class TTB(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    site_id: str
    site_name: str  # Denormalized from Site
    title: str
    file_path: str  # Server filesystem path
    file_url: str   # URL path for download
    file_name: str  # Original filename
    uploaded_by: str  # User ID
    uploaded_by_name: str  # Denormalized username
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
class TTBCreate(BaseModel):
    site_id: str
    title: str
class PaginatedTTBResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    limit: int
    total_pages: int

# ============ DOCUMENTATION MODELS ============
class Documentation(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    site_id: str
    site_name: str
    title: str
    file_path: str
    file_url: str
    file_name: str
    uploaded_by: str
    uploaded_by_name: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DocumentationCreate(BaseModel):
    site_id: str
    title: str

class PaginatedDocumentationResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    limit: int
    total_pages: int

# ============ WORK ORDER MODELS ============
class WorkOrder(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    ticket_number: str
    site_id: str
    site_name: str
    pop: str
    package: str
    activity: List[str] = []
    sn_ont: str
    username_wo: str
    password_wo: str
    gpon: str
    status: str = "Created"  # Created, On Progress, Teknis Stage, Done
    created_by: str
    created_by_name: str
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None
    comments: List[dict] = []

class WorkOrderCreate(BaseModel):
    ticket_number: str
    site_id: str
    pop: str
    package: str
    activity: List[str]
    sn_ont: str
    username_wo: str
    password_wo: str
    gpon: str
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    notes: Optional[str] = None

class WorkOrderUpdate(BaseModel):
    ticket_number: Optional[str] = None
    site_id: Optional[str] = None
    pop: Optional[str] = None
    package: Optional[str] = None
    activity: Optional[List[str]] = None
    sn_ont: Optional[str] = None
    username_wo: Optional[str] = None
    password_wo: Optional[str] = None
    gpon: Optional[str] = None
    assigned_to: Optional[str] = None
    assigned_to_name: Optional[str] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class PaginatedWorkOrderResponse(BaseModel):
    items: List[WorkOrder]
    total: int
    page: int
    limit: int
    total_pages: int

class WorkOrderComment(BaseModel):
    wo_id: str
    comment: str
# ============ SITE SETTINGS MODELS ============
class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = "site_settings"
    ticket_notification_chat_id: Optional[str] = None
    fiberzone_notification_chat_id: Optional[str] = None
    ticket_notification_interval: int = 60  # Default 60 minutes
    ticket_notification_categories: List[str] = [] # NEW: Categories that trigger Telegram notification
    frontend_url: Optional[str] = "https://vlux.varnion.net.id:3002"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SettingsUpdate(BaseModel):
    ticket_notification_chat_id: Optional[str] = None
    fiberzone_notification_chat_id: Optional[str] = None
    ticket_notification_interval: Optional[int] = None
    ticket_notification_categories: Optional[List[str]] = None
    frontend_url: Optional[str] = None

# ============ ORGANIZATION CONFIGURATION MODELS ============

class DivisionMapping(BaseModel):
    """Maps division names/roles to their IDs for feature-specific logic"""
    manager_division_id: Optional[str] = None  # Division where Managers belong
    admin_division_id: Optional[str] = None  # Admin division ID
    # Add more mappings as needed for specific features
    fiberzone_division_id: Optional[str] = None  # ID of Fiberzone division (replaces hardcoded "Fiberzone")
    apps_division_id: Optional[str] = None  # ID of Apps division
    infra_division_id: Optional[str] = None  # ID of Infra division
    ts_division_id: Optional[str] = None  # ID of TS division
    tech_ops_department_id: Optional[str] = None  # ID of Technical Operation department
    sales_department_id: Optional[str] = None  # ID of Sales department for visibility/access logic

class OrganizationConfig(BaseModel):
    """Global organization configuration - replaces all hardcoded rules"""
    model_config = ConfigDict(extra="ignore")
    id: str = "org_config"
    # Division mappings dictionary
    division_mappings: DivisionMapping = Field(default_factory=DivisionMapping)
    # Email domain configuration
    allowed_email_domains: List[str] = ["@varnion.net.id", "@fiberzone.id"]
    # Feature flags
    enable_fiberzone_dashboard: bool = True
    enable_fiberzone_special_schedule: bool = True  # Fiberzone-specific schedule rules
    # Role-Division restrictions (replaces hardcoded lists)
    staff_only_division_ids: List[str] = []  # Divisions restricted to Staff role
    # Hierarchy mappings (replaces hardcoded TS->Apps, Infra->Fiberzone logic)
    division_hierarchy: Dict[str, List[str]] = Field(default_factory=dict)  # parent_id -> [child_ids]
    # Concatenation filters (replaces hardcoded "Infra & Fiberzone" strings)
    division_concatenations: Dict[str, List[str]] = Field(
        default_factory=dict
    )  # label -> [division_ids]
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OrganizationConfigUpdate(BaseModel):
    division_mappings: Optional[DivisionMapping] = None
    allowed_email_domains: Optional[List[str]] = None
    enable_fiberzone_dashboard: Optional[bool] = None
    enable_fiberzone_special_schedule: Optional[bool] = None
    staff_only_division_ids: Optional[List[str]] = None
    division_hierarchy: Optional[Dict[str, List[str]]] = None
    division_concatenations: Optional[Dict[str, List[str]]] = None

# ============ PROJECT MANAGEMENT MODELS ============
class Project(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    key: str  # e.g. "TECH", "PROJ"
    type: str = "WAAS"  # WAAS, VLEPO, FTTR, Internet, WAAS, Internet, WAAS, Vlepo, All Product
    status: str = "Open"  # Open, Hold, Finished
    description: Optional[str] = None
    leader_id: Optional[str] = None
    leader_name: Optional[str] = None
    sales_user_id: Optional[str] = None
    sales_user_name: Optional[str] = None
    site_id: Optional[str] = None
    site_name: Optional[str] = None
    task_counter: int = 0  # Auto-incrementing for task numbers like TECH-01
    created_by: str = ""
    created_by_name: str = ""
    finished_at: Optional[datetime] = None
    due_date: Optional[datetime] = None
    tech_vp_approved_at: Optional[datetime] = None
    sales_vp_approved_at: Optional[datetime] = None
    tech_vp_user_id: Optional[str] = None
    sales_vp_user_id: Optional[str] = None
    tech_vp_user_name: Optional[str] = None
    sales_vp_user_name: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectCreate(BaseModel):
    name: str
    key: str
    type: str = "WAAS"
    status: Optional[str] = None
    description: Optional[str] = None
    leader_id: Optional[str] = None
    sales_user_id: Optional[str] = None
    site_id: Optional[str] = None
    due_date: Optional[str] = None

class ProjectUpdate(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    description: Optional[str] = None
    leader_id: Optional[str] = None
    sales_user_id: Optional[str] = None
    site_id: Optional[str] = None
    due_date: Optional[str] = None

class PaginatedProjectResponse(BaseModel):
    items: List[Any]
    total: int
    page: int
    limit: int
    total_pages: int

class ProjectActivityLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    user_id: str
    user_name: str
    action_category: str  # 'General', 'Task', 'Comment'
    action_description: str
    payload: dict = {}
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PaginatedProjectActivityLogResponse(BaseModel):
    items: List[ProjectActivityLog]
    total: int
    page: int
    limit: int
    total_pages: int

class ProjectApprovalAction(BaseModel):
    type: str  # "tech" or "sales"

class TaskStatus(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    name: str  # e.g. "To Do", "In Progress", "Done"
    order: int = 0
    color: str = "#6b7280"  # Default gray
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TaskStatusCreate(BaseModel):
    name: str
    order: int = 0
    color: str = "#6b7280"

class StatusReorderItem(BaseModel):
    id: str
    order: int

class StatusReorderRequest(BaseModel):
    statuses: List[StatusReorderItem]

class ProjectTask(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    project_id: str
    project_key: str
    task_number: str = ""  # e.g. "TECH-01"
    title: str
    description: Optional[str] = None
    type: str = "Task"  # Task, Bug, Story
    status: str = "To Do"
    priority: str = "Medium"  # High, Medium, Low
    assignee_id: Optional[str] = None
    assignee_name: Optional[str] = None
    reporter_id: str = ""
    reporter_name: str = ""
    comments: List[dict] = []
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    color_hex: str = "#3b82f6"  # Custom hex color for task bar, defaults to blue
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ProjectTaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    type: str = "Task"
    status: str = "To Do"
    priority: str = "Medium"
    assignee_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    color_hex: Optional[str] = None  # Custom hex color for task bar

class ProjectTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    priority: Optional[str] = None
    assignee_id: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    color_hex: Optional[str] = None  # Custom hex color for task bar

class ProjectTaskComment(BaseModel):
    comment: str

# ============ FIBERZONE SCHEDULE MODELS ============
class FiberzoneSchedule(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    site_id: str
    site_name: str
    title: str  # e.g. "Install New Client"
    start_time: datetime
    end_time: datetime
    status: str = "Scheduled"  # Scheduled, Finished
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    # Notification flags
    notified_1h_before: bool = False
    auto_finished: bool = False
    product: str = "Fiberzone"  # NEW: Automatically set

class FiberzoneScheduleCreate(BaseModel):
    user_ids: List[str]  # Bulk assignment support
    site_id: str
    title: str
    start_time: str  # ISO datetime string
    end_time: str     # ISO datetime string
    product: str = "Fiberzone"  # Default but can be accepted

class FiberzoneScheduleUpdate(BaseModel):
    user_id: Optional[str] = None
    site_id: Optional[str] = None
    title: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    product: Optional[str] = None

# ============ DEPARTMENT PERMISSION MODELS ============
class DepartmentPermission(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    department_id: str           # matches Department.id
    department_name: str         # denormalized for display
    menu_key: str                # 'scheduler', 'activity', 'reports', 'tickets', 'ttb', 'sites', 'projects', 'fiberzone'
    can_view: bool = True
    can_edit: bool = True
    report_visibility: Optional[str] = "all"  # 'all' | 'final_only'  — only meaningful for menu_key='reports'
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DepartmentPermissionUpsert(BaseModel):
    permissions: List[dict]  # [{menu_key, can_view, can_edit, report_visibility}]

# ============ SUMMARY PRESET MODELS ============
class SummaryPreset(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    order: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SummaryPresetCreate(BaseModel):
    name: str
    order: int = 0

# ============ AUTH TOKEN MODELS ============
class AuthToken(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    token: str
    type: str  # 'login' or 'reset'
    expires_at: datetime
    used: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ForgotPasswordRequest(BaseModel):
    email: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class VerifyLoginRequest(BaseModel):
    token: str

class AdminResetPasswordRequest(BaseModel):
    new_password: str

# ============ USER ACCESS LOG MODELS ============
class UserAccessLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    user_name: str
    user_email: str

    access_time: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
