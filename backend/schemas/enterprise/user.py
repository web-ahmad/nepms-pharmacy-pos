"""
schemas/enterprise/user.py
────────────────────────────
Pydantic v2 schemas for the Enterprise Users & Identity Management module.
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field, model_validator


# ── Nested schemas ─────────────────────────────────────────────────────────────

class EmergencyContact(BaseModel):
    name: str
    phone: str
    relationship: Optional[str] = None

class NotificationPreferences(BaseModel):
    email:      bool = True
    sms:        bool = False
    push:       bool = True
    in_app:     bool = True
    whatsapp:   bool = False

class LoginRestrictions(BaseModel):
    allowed_branches:           Optional[List[str]] = None
    allowed_devices:            Optional[List[str]] = None
    allowed_ips:                Optional[List[str]] = None
    allowed_hours:              Optional[Dict[str, Any]] = None
    max_concurrent_sessions:    int = 3
    geo_restriction_enabled:    bool = False

class AllowedHours(BaseModel):
    start: str = "00:00"
    end:   str = "23:59"


# ── EnterprisePermission schemas ───────────────────────────────────────────────

class PermissionRead(BaseModel):
    id:             str
    module:         str
    action:         str
    code:           str
    label:          Optional[str]
    description:    Optional[str]
    is_sensitive:   bool

    model_config = {"from_attributes": True}


class PermissionGrouped(BaseModel):
    module:         str
    permissions:    List[PermissionRead]


# ── EnterpriseRole schemas ─────────────────────────────────────────────────────

class RoleBase(BaseModel):
    name:               str = Field(..., min_length=1, max_length=100)
    description:        Optional[str] = None
    color:              Optional[str] = "#6366f1"
    icon:               Optional[str] = None
    is_system_default:  bool = False
    is_branch_specific: bool = False
    user_type:          Optional[str] = None
    max_users:          Optional[int] = None
    sort_order:         int = 0
    branch_scope:       Optional[str] = "assigned_branch"  # global|tenant|all_branches|assigned_branch|assigned_counter|selected_branches
    data_scope:         Optional[str] = "branch"           # global|tenant|branch|own_records
    hierarchy_level:    Optional[int] = None

class RoleCreate(RoleBase):
    permission_ids: Optional[List[str]] = None

class RoleUpdate(BaseModel):
    name:               Optional[str] = None
    description:        Optional[str] = None
    color:              Optional[str] = None
    icon:               Optional[str] = None
    is_branch_specific: Optional[bool] = None
    user_type:          Optional[str] = None
    max_users:          Optional[int] = None
    sort_order:         Optional[int] = None
    branch_scope:       Optional[str] = None
    data_scope:         Optional[str] = None
    permission_ids:     Optional[List[str]] = None

class RoleRead(RoleBase):
    id:                 str
    pharmacy_id:        Optional[str]
    permission_count:   int = 0
    user_count:         int = 0
    permissions:        List[PermissionRead] = []
    created_at:         datetime
    updated_at:         Optional[datetime]

    model_config = {"from_attributes": True}

class RoleListItem(BaseModel):
    id:             str
    name:           str
    description:    Optional[str]
    color:          Optional[str]
    icon:           Optional[str]
    is_system_default: bool
    user_type:      Optional[str]
    branch_scope:   Optional[str] = None
    data_scope:     Optional[str] = None
    sort_order:     int = 0
    permission_count: int = 0
    user_count:     int = 0
    hierarchy_level: int = 4
    created_at:     datetime

    model_config = {"from_attributes": True}

class RoleCloneRequest(BaseModel):
    new_name:   str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None

class PermissionMatrixUpdate(BaseModel):
    permission_ids: List[str]


# ── EnterpriseUser schemas ─────────────────────────────────────────────────────

class EnterpriseUserBase(BaseModel):
    user_type:              str = "custom"
    enterprise_role_id:     Optional[str] = None

    # Profile
    avatar_url:             Optional[str] = None
    theme_preference:       Optional[str] = "system"
    language:               Optional[str] = "en"
    timezone:               Optional[str] = "Asia/Karachi"
    emergency_contact:      Optional[EmergencyContact] = None
    notes:                  Optional[str] = None

    # Notification prefs
    notif_email:            bool = True
    notif_sms:              bool = False
    notif_push:             bool = True
    notif_in_app:           bool = True
    notif_whatsapp:         bool = False

    # Staff identity
    employee_id:            Optional[str] = None
    cnic:                   Optional[str] = None
    license_number:         Optional[str] = None
    qualification:          Optional[str] = None
    joining_date:           Optional[date] = None
    blood_group:            Optional[str] = None
    address:                Optional[str] = None

    # Login restrictions
    allowed_branches:       Optional[List[str]] = None
    allowed_devices:        Optional[List[str]] = None
    allowed_ips:            Optional[List[str]] = None
    allowed_hours:          Optional[Dict[str, Any]] = None
    max_concurrent_sessions: int = 3
    geo_restriction_enabled: bool = False

    # Security
    force_password_change:  bool = False


class EnterpriseUserCreate(EnterpriseUserBase):
    # Core auth fields (passed in on create, forwarded to users table)
    username:       str = Field(..., min_length=3, max_length=150)
    email:          EmailStr
    password:       str = Field(..., min_length=8)
    full_name:      Optional[str] = None
    phone:          Optional[str] = None

    # Initial branch assignment
    default_branch_id:  Optional[str] = None
    branch_role:        Optional[str] = "staff"


class EnterpriseUserUpdate(BaseModel):
    user_type:              Optional[str] = None
    enterprise_role_id:     Optional[str] = None
    full_name:              Optional[str] = None
    phone:                  Optional[str] = None
    avatar_url:             Optional[str] = None
    theme_preference:       Optional[str] = None
    language:               Optional[str] = None
    timezone:               Optional[str] = None
    emergency_contact:      Optional[Dict[str, Any]] = None
    notes:                  Optional[str] = None
    notif_email:            Optional[bool] = None
    notif_sms:              Optional[bool] = None
    notif_push:             Optional[bool] = None
    notif_in_app:           Optional[bool] = None
    notif_whatsapp:         Optional[bool] = None
    employee_id:            Optional[str] = None
    cnic:                   Optional[str] = None
    license_number:         Optional[str] = None
    qualification:          Optional[str] = None
    joining_date:           Optional[date] = None
    blood_group:            Optional[str] = None
    address:                Optional[str] = None
    allowed_branches:       Optional[List[str]] = None
    allowed_devices:        Optional[List[str]] = None
    allowed_ips:            Optional[List[str]] = None
    allowed_hours:          Optional[Dict[str, Any]] = None
    max_concurrent_sessions: Optional[int] = None
    geo_restriction_enabled: Optional[bool] = None


class BranchInfoNested(BaseModel):
    id:     str
    name:   str
    code:   str
    city:   Optional[str]
    status: str

    model_config = {"from_attributes": True}

class BranchAssignmentRead(BaseModel):
    id:                 str
    branch_id:          str
    branch:             Optional[BranchInfoNested]
    role:               str
    is_default_branch:  bool
    is_temporary:       bool
    access_expires_at:  Optional[datetime]
    assigned_at:        datetime
    is_active:          bool
    notes:              Optional[str]

    model_config = {"from_attributes": True}


class EnterpriseUserRead(BaseModel):
    id:                     str
    user_id:                str
    pharmacy_id:            Optional[str]
    user_type:              str
    status:                 str
    enterprise_role_id:     Optional[str]

    # Auth user fields (denormalized)
    username:               Optional[str]
    email:                  Optional[str]
    full_name:              Optional[str]
    phone:                  Optional[str]
    is_active:              bool = True

    # Profile
    avatar_url:             Optional[str]
    theme_preference:       Optional[str]
    language:               Optional[str]
    timezone:               Optional[str]
    emergency_contact:      Optional[Dict[str, Any]]
    notes:                  Optional[str]

    # Notification
    notif_email:            bool
    notif_sms:              bool
    notif_push:             bool
    notif_in_app:           bool
    notif_whatsapp:         bool

    # Staff
    employee_id:            Optional[str]
    cnic:                   Optional[str]
    license_number:         Optional[str]
    qualification:          Optional[str]
    joining_date:           Optional[date]
    blood_group:            Optional[str]
    address:                Optional[str]

    # Security state
    failed_login_count:     int
    force_password_change:  bool
    password_changed_at:    Optional[datetime]
    password_expires_at:    Optional[datetime]
    two_factor_enabled:     bool
    otp_enabled:            bool
    last_login_at:          Optional[datetime]
    last_login_ip:          Optional[str]
    last_activity_at:       Optional[datetime]

    # Login restrictions
    allowed_branches:       Optional[List[str]]
    allowed_devices:        Optional[List[str]]
    allowed_ips:            Optional[List[str]]
    allowed_hours:          Optional[Dict[str, Any]]
    max_concurrent_sessions: int
    geo_restriction_enabled: bool

    # Role info
    enterprise_role:        Optional[RoleListItem] = None

    # Branch assignments
    branch_assignments:     List[BranchAssignmentRead] = []

    created_at:             datetime
    updated_at:             Optional[datetime]

    model_config = {"from_attributes": True}


class EnterpriseUserListItem(BaseModel):
    id:                 str
    user_id:            str
    user_type:          str
    status:             str
    username:           Optional[str]
    email:              Optional[str]
    full_name:          Optional[str]
    phone:              Optional[str]
    avatar_url:         Optional[str]
    employee_id:        Optional[str]
    enterprise_role:    Optional[RoleListItem] = None
    branch_count:       int = 0
    last_login_at:      Optional[datetime]
    created_at:         datetime

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    items:  List[EnterpriseUserListItem]
    total:  int
    page:   int
    pages:  int
    limit:  int


class UserListParams(BaseModel):
    search:     Optional[str] = None
    status:     Optional[str] = None
    user_type:  Optional[str] = None
    role_id:    Optional[str] = None
    branch_id:  Optional[str] = None
    sort_by:    str = "created_at"
    sort_dir:   str = "desc"
    page:       int = 1
    limit:      int = 20


# ── Branch assignment schemas ──────────────────────────────────────────────────

class BranchAssignmentCreate(BaseModel):
    branch_id:          str
    role:               str = "staff"
    is_default_branch:  bool = False
    is_temporary:       bool = False
    access_expires_at:  Optional[datetime] = None
    notes:              Optional[str] = None
    permission_overrides: Optional[List[str]] = None

class BranchTransferRequest(BaseModel):
    from_branch_id:     str
    to_branch_id:       str
    role:               str = "staff"
    reason:             Optional[str] = None


# ── Session schemas ────────────────────────────────────────────────────────────

class SessionRead(BaseModel):
    id:                 str
    device_name:        Optional[str]
    browser:            Optional[str]
    os:                 Optional[str]
    ip_address:         Optional[str]
    location:           Optional[Dict[str, Any]]
    is_active:          bool
    remember_me:        bool
    last_activity_at:   Optional[datetime]
    expires_at:         Optional[datetime]
    created_at:         datetime

    model_config = {"from_attributes": True}


# ── Trusted device schemas ─────────────────────────────────────────────────────

class TrustedDeviceRead(BaseModel):
    id:                 str
    device_fingerprint: str
    device_name:        Optional[str]
    browser:            Optional[str]
    os:                 Optional[str]
    ip_address:         Optional[str]
    is_trusted:         bool
    is_blocked:         bool
    first_seen_at:      datetime
    last_seen_at:       datetime

    model_config = {"from_attributes": True}


# ── Login history schemas ──────────────────────────────────────────────────────

class LoginHistoryRead(BaseModel):
    id:                 str
    event_type:         str
    ip_address:         Optional[str]
    device_name:        Optional[str]
    browser:            Optional[str]
    os:                 Optional[str]
    location:           Optional[Dict[str, Any]]
    success:            bool
    failure_reason:     Optional[str]
    created_at:         datetime

    model_config = {"from_attributes": True}


# ── Activity log schemas ───────────────────────────────────────────────────────

class ActivityLogRead(BaseModel):
    id:                 str
    event_type:         str
    description:        Optional[str]
    metadata:           Optional[Dict[str, Any]]
    performed_by_id:    Optional[str]
    ip_address:         Optional[str]
    created_at:         datetime

    model_config = {"from_attributes": True}


# ── Approval workflow schemas ──────────────────────────────────────────────────

class ApprovalRequestRead(BaseModel):
    id:                 str
    enterprise_user_id: str
    approval_type:      str
    status:             str
    requested_by_id:    str
    reviewed_by_id:     Optional[str]
    requested_at:       datetime
    reviewed_at:        Optional[datetime]
    reason:             Optional[str]
    review_note:        Optional[str]
    payload:            Optional[Dict[str, Any]]

    model_config = {"from_attributes": True}

class ApprovalAction(BaseModel):
    action:     str     # "approve" | "reject"
    note:       Optional[str] = None


# ── Security actions ───────────────────────────────────────────────────────────

class PasswordResetRequest(BaseModel):
    new_password:   Optional[str] = None    # if None, generates random
    force_change:   bool = True
    notify_user:    bool = True

class SuspendRequest(BaseModel):
    reason:     str
    notify_user: bool = True

class LockRequest(BaseModel):
    reason:         str
    permanent:      bool = False
    notify_user:    bool = True

class UnlockRequest(BaseModel):
    reason:     Optional[str] = None


# ── Dashboard summary ──────────────────────────────────────────────────────────

class UserDashboardSummary(BaseModel):
    total_users:            int = 0
    active_users:           int = 0
    inactive_users:         int = 0
    suspended_users:        int = 0
    locked_users:           int = 0
    pending_approval:       int = 0
    online_users:           int = 0
    active_sessions:        int = 0
    trusted_devices:        int = 0
    blocked_devices:        int = 0
    failed_logins_today:    int = 0
    pending_approvals:      int = 0
    by_role:                List[Dict[str, Any]] = []
    by_branch:              List[Dict[str, Any]] = []
    by_type:                List[Dict[str, Any]] = []


# ── Paginated responses ────────────────────────────────────────────────────────

class PaginatedSessions(BaseModel):
    items:  List[SessionRead]
    total:  int

class PaginatedLoginHistory(BaseModel):
    items:  List[LoginHistoryRead]
    total:  int

class PaginatedActivity(BaseModel):
    items:  List[ActivityLogRead]
    total:  int

class PaginatedApprovals(BaseModel):
    items:  List[ApprovalRequestRead]
    total:  int

class PaginatedDevices(BaseModel):
    items:  List[TrustedDeviceRead]
    total:  int

class RoleListResponse(BaseModel):
    items:  List[RoleListItem]
    total:  int
