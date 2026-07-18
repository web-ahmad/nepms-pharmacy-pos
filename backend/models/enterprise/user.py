"""
models/enterprise/user.py
──────────────────────────
Enterprise Users & Identity Management Domain Models.

Models
──────
EnterpriseUser          — Extended user profile (avatar, signature, staff info, login restrictions)
EnterpriseRole          — Rich RBAC role with pharmacy scope
EnterprisePermission    — Flat permission registry (module × action)
EnterpriseRolePermission — M2M role ↔ permission
BranchUserAssignment    — User ↔ PharmacyBranch with role + expiry
UserSession             — Active/historical sessions
UserTrustedDevice       — Fingerprinted trusted devices
UserLoginHistory        — Login/logout events
UserActivityLog         — Identity lifecycle audit trail
UserApprovalRequest     — Approval workflow for sensitive identity changes

Design rules
────────────
• All models inherit BaseModel → pharmacy_id, is_deleted, sync_version, created_at, updated_at
• No circular FK imports — FKs use table-name strings
• JSON columns use SQLAlchemy JSON for SQLite + Postgres compatibility
• Soft delete only
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, DateTime, Float, ForeignKey,
    Integer, JSON, String, Text, Date, UniqueConstraint
)
from sqlalchemy.orm import relationship

from models.base import BaseModel


# ── Enumerations ──────────────────────────────────────────────────────────────

class EnterpriseUserStatus(str, enum.Enum):
    ACTIVE              = "active"
    INACTIVE            = "inactive"
    SUSPENDED           = "suspended"
    LOCKED_TEMP         = "locked_temp"     # temporary lock (failed logins)
    LOCKED_PERMANENT    = "locked_permanent" # admin lock
    PENDING_APPROVAL    = "pending_approval"
    FORCE_CHANGE        = "force_change"     # must change password on next login


class EnterpriseUserType(str, enum.Enum):
    PHARMACY_OWNER      = "pharmacy_owner"
    SUPER_ADMIN         = "super_admin"
    BRANCH_MANAGER      = "branch_manager"
    PHARMACIST          = "pharmacist"
    ASSISTANT_PHARMACIST = "assistant_pharmacist"
    CASHIER             = "cashier"
    STORE_KEEPER        = "store_keeper"
    PURCHASE_OFFICER    = "purchase_officer"
    ACCOUNTANT          = "accountant"
    HR                  = "hr"
    DELIVERY_STAFF      = "delivery_staff"
    AUDITOR             = "auditor"
    READ_ONLY           = "read_only"
    CUSTOM              = "custom"


class ApprovalStatus(str, enum.Enum):
    PENDING     = "pending"
    APPROVED    = "approved"
    REJECTED    = "rejected"
    CANCELLED   = "cancelled"


class ApprovalType(str, enum.Enum):
    NEW_USER                = "new_user"
    ROLE_CHANGE             = "role_change"
    BRANCH_TRANSFER         = "branch_transfer"
    PERMISSION_ESCALATION   = "permission_escalation"
    UNLOCK_ACCOUNT          = "unlock_account"


class ActivityEventType(str, enum.Enum):
    LOGIN                   = "login"
    LOGOUT                  = "logout"
    LOGIN_FAILED            = "login_failed"
    PASSWORD_CHANGE         = "password_change"
    PASSWORD_RESET          = "password_reset"
    PASSWORD_EXPIRED        = "password_expired"
    BRANCH_ASSIGNMENT       = "branch_assignment"
    BRANCH_REMOVAL          = "branch_removal"
    BRANCH_TRANSFER         = "branch_transfer"
    ROLE_ASSIGNMENT         = "role_assignment"
    PERMISSION_CHANGE       = "permission_change"
    DEVICE_REGISTERED       = "device_registered"
    DEVICE_REVOKED          = "device_revoked"
    DEVICE_BLOCKED          = "device_blocked"
    SESSION_TERMINATED      = "session_terminated"
    ACCOUNT_LOCKED          = "account_locked"
    ACCOUNT_UNLOCKED        = "account_unlocked"
    ACCOUNT_SUSPENDED       = "account_suspended"
    ACCOUNT_ACTIVATED       = "account_activated"
    PROFILE_UPDATED         = "profile_updated"
    APPROVAL_REQUESTED      = "approval_requested"
    APPROVAL_GRANTED        = "approval_granted"
    APPROVAL_REJECTED       = "approval_rejected"


# ── EnterpriseUser ────────────────────────────────────────────────────────────

class EnterpriseUser(BaseModel):
    """
    Extended user profile linked 1-to-1 with the core `users` table.

    Does NOT duplicate auth fields (username, email, hashed_password).
    Adds: staff info, avatar, signature, login restrictions, security state.
    """
    __tablename__ = "enterprise_users"

    # ── Link to core auth user ─────────────────────────────────────────────────
    user_id             = Column(String(36), ForeignKey("users.id"), nullable=False, unique=True, index=True)
    user_type           = Column(String(50), nullable=False, default=EnterpriseUserType.CUSTOM.value, index=True)
    status              = Column(String(30), nullable=False, default=EnterpriseUserStatus.ACTIVE.value, index=True)

    # ── Enterprise role (RBAC) ─────────────────────────────────────────────────
    enterprise_role_id  = Column(String(36), ForeignKey("enterprise_roles.id"), nullable=True, index=True)

    # ── Profile ────────────────────────────────────────────────────────────────
    avatar_url          = Column(Text,        nullable=True)
    digital_signature   = Column(Text,        nullable=True)   # base64 or URL
    theme_preference    = Column(String(20),  nullable=True, default="system")   # light/dark/system
    language            = Column(String(10),  nullable=True, default="en")
    timezone            = Column(String(50),  nullable=True, default="Asia/Karachi")
    emergency_contact   = Column(JSON,        nullable=True)   # {name, phone, relationship}
    notes               = Column(Text,        nullable=True)

    # ── Notification preferences ────────────────────────────────────────────────
    notif_email         = Column(Boolean, default=True)
    notif_sms           = Column(Boolean, default=False)
    notif_push          = Column(Boolean, default=True)
    notif_in_app        = Column(Boolean, default=True)
    notif_whatsapp      = Column(Boolean, default=False)      # future

    # ── Staff / HR identity (NOT payroll / attendance) ─────────────────────────
    employee_id         = Column(String(50),  nullable=True, unique=False, index=True)
    cnic                = Column(String(20),  nullable=True)   # Pakistani CNIC
    license_number      = Column(String(100), nullable=True)   # Pharmacist license
    qualification       = Column(String(255), nullable=True)
    joining_date        = Column(Date,        nullable=True)
    blood_group         = Column(String(10),  nullable=True)
    address             = Column(Text,        nullable=True)

    # ── Security state ──────────────────────────────────────────────────────────
    failed_login_count  = Column(Integer,  default=0)
    locked_at           = Column(DateTime, nullable=True)       # when temp lock was set
    lock_reason         = Column(Text,     nullable=True)
    force_password_change = Column(Boolean, default=False)
    password_changed_at = Column(DateTime, nullable=True)
    password_expires_at = Column(DateTime, nullable=True)       # null = never
    password_history    = Column(JSON,     nullable=True)       # list of last N hashes
    two_factor_enabled  = Column(Boolean,  default=False)       # 2FA flag (implementation ready)
    two_factor_secret   = Column(String(100), nullable=True)    # TOTP secret
    recovery_codes      = Column(JSON,     nullable=True)       # list of hashed recovery codes
    otp_enabled         = Column(Boolean,  default=False)

    # ── Login restrictions ──────────────────────────────────────────────────────
    allowed_branches    = Column(JSON,  nullable=True)   # list of branch IDs; null = all
    allowed_devices     = Column(JSON,  nullable=True)   # list of device fingerprints
    allowed_ips         = Column(JSON,  nullable=True)   # list of CIDR strings
    allowed_hours       = Column(JSON,  nullable=True)   # {start: "08:00", end: "20:00"} or per-day
    max_concurrent_sessions = Column(Integer, default=3)
    geo_restriction_enabled = Column(Boolean, default=False)

    # ── Tracking ────────────────────────────────────────────────────────────────
    last_login_at       = Column(DateTime, nullable=True)
    last_login_ip       = Column(String(45), nullable=True)
    last_activity_at    = Column(DateTime, nullable=True)

    # ── ORM ────────────────────────────────────────────────────────────────────
    user                = relationship("User", foreign_keys=[user_id])
    enterprise_role     = relationship("EnterpriseRole", foreign_keys=[enterprise_role_id])
    branch_assignments  = relationship("BranchUserAssignment", back_populates="enterprise_user", cascade="all, delete-orphan")
    sessions            = relationship("UserSession", back_populates="enterprise_user", cascade="all, delete-orphan")
    trusted_devices     = relationship("UserTrustedDevice", back_populates="enterprise_user", cascade="all, delete-orphan")
    login_history       = relationship("UserLoginHistory", back_populates="enterprise_user", cascade="all, delete-orphan")
    activity_logs       = relationship("UserActivityLog", back_populates="enterprise_user", cascade="all, delete-orphan")


# ── EnterprisePermission ──────────────────────────────────────────────────────

class EnterprisePermission(BaseModel):
    """Flat permission registry — module × action pairs."""
    __tablename__ = "enterprise_permissions"
    __table_args__ = (UniqueConstraint("pharmacy_id", "code", name="uq_ent_perm_pharm_code"),)

    module          = Column(String(100), nullable=False, index=True)
    action          = Column(String(100), nullable=False)
    code            = Column(String(200), nullable=False, index=True)  # e.g. "inventory:view"
    label           = Column(String(255), nullable=True)
    description     = Column(Text,        nullable=True)
    is_sensitive    = Column(Boolean, default=False)    # requires 2FA or approval

    role_permissions = relationship("EnterpriseRolePermission", back_populates="permission", cascade="all, delete-orphan")


# ── EnterpriseRole ────────────────────────────────────────────────────────────

class EnterpriseRole(BaseModel):
    """
    Rich RBAC role scoped to a pharmacy.

    hierarchy_level controls what the role can access:
        1 = Software Company Super Admin  (SaaS-only, no pharmacy data)
        2 = Pharmacy Owner                (whole tenant, all branches)
        3 = Branch Owner                  (own branch only)
        4 = Branch Staff                  (permission-driven, own branch)
    """
    __tablename__ = "enterprise_roles"

    name                = Column(String(100), nullable=False, index=True)
    description         = Column(Text,        nullable=True)
    color               = Column(String(20),  nullable=True, default="#6366f1")   # hex
    icon                = Column(String(50),  nullable=True)                       # lucide icon name
    is_system_default   = Column(Boolean, default=False)   # cannot be deleted by users
    is_system_role      = Column(Boolean, default=False)   # super admin only, hidden from tenants
    is_branch_specific  = Column(Boolean, default=False)   # permissions vary per branch
    user_type           = Column(String(50),  nullable=True)    # maps to EnterpriseUserType
    max_users           = Column(Integer,  nullable=True)        # null = unlimited
    sort_order          = Column(Integer,  default=0)
    branch_scope        = Column(String(50),  nullable=True, default="assigned_branch")
    # branch_scope values: global | all_branches | assigned_branch | assigned_counter
    data_scope          = Column(String(50),  nullable=True, default="branch")
    # data_scope values:   global | tenant | branch | own_records

    # ── Hierarchy Level — THE canonical field for access control ─────────────
    # NEVER check role.name for business logic. Use hierarchy_level instead.
    hierarchy_level     = Column(Integer, nullable=False, default=4, index=True)
    # 1 = Super Admin (SaaS), 2 = Pharmacy Owner, 3 = Branch Owner, 4 = Staff

    # Whether this role is visible only to SaaS admins (level 1)
    is_global_role      = Column(Boolean, default=False)

    role_permissions    = relationship("EnterpriseRolePermission", back_populates="role", cascade="all, delete-orphan")
    users               = relationship("EnterpriseUser", back_populates="enterprise_role")



# ── EnterpriseRolePermission ──────────────────────────────────────────────────

class EnterpriseRolePermission(BaseModel):
    """M2M: role ↔ permission."""
    __tablename__ = "enterprise_role_permissions"

    role_id             = Column(String(36), ForeignKey("enterprise_roles.id"), nullable=False, index=True)
    permission_id       = Column(String(36), ForeignKey("enterprise_permissions.id"), nullable=False, index=True)

    role                = relationship("EnterpriseRole", back_populates="role_permissions")
    permission          = relationship("EnterprisePermission", back_populates="role_permissions")


# ── BranchUserAssignment ──────────────────────────────────────────────────────

class BranchUserAssignment(BaseModel):
    """
    Enterprise branch ↔ user with role + expiry + transfer tracking.
    Replaces the legacy BranchStaffAssignment for enterprise users.
    """
    __tablename__ = "branch_user_assignments"

    enterprise_user_id  = Column(String(36), ForeignKey("enterprise_users.id"), nullable=False, index=True)
    branch_id           = Column(String(36), ForeignKey("pharmacy_branches.id"), nullable=False, index=True)
    role                = Column(String(50), nullable=False, default="staff")
    is_default_branch   = Column(Boolean, default=False)
    is_temporary        = Column(Boolean, default=False)
    access_expires_at   = Column(DateTime, nullable=True)   # null = permanent
    assigned_at         = Column(DateTime, default=datetime.utcnow)
    assigned_by_id      = Column(String(36), ForeignKey("users.id"), nullable=True)
    notes               = Column(Text, nullable=True)
    is_active           = Column(Boolean, default=True)

    # Branch-specific permission overrides (JSON list of permission codes)
    permission_overrides = Column(JSON, nullable=True)

    enterprise_user     = relationship("EnterpriseUser", back_populates="branch_assignments")
    branch              = relationship("PharmacyBranch", foreign_keys=[branch_id])
    assigned_by         = relationship("User", foreign_keys=[assigned_by_id])


# ── UserSession ───────────────────────────────────────────────────────────────

class UserSession(BaseModel):
    """Active and historical user sessions."""
    __tablename__ = "user_sessions"

    enterprise_user_id  = Column(String(36), ForeignKey("enterprise_users.id"), nullable=False, index=True)
    session_token       = Column(String(255), nullable=False, unique=True, index=True)
    refresh_token       = Column(String(255), nullable=True)
    device_fingerprint  = Column(String(255), nullable=True, index=True)
    device_name         = Column(String(255), nullable=True)
    browser             = Column(String(100), nullable=True)
    os                  = Column(String(100), nullable=True)
    ip_address          = Column(String(45),  nullable=True)
    user_agent          = Column(Text,        nullable=True)
    location            = Column(JSON,        nullable=True)   # {city, country, lat, lng}
    is_active           = Column(Boolean, default=True)
    remember_me         = Column(Boolean, default=False)
    last_activity_at    = Column(DateTime, default=datetime.utcnow)
    expires_at          = Column(DateTime, nullable=True)
    terminated_at       = Column(DateTime, nullable=True)
    terminated_reason   = Column(String(100), nullable=True)  # logout/timeout/admin/remote

    enterprise_user     = relationship("EnterpriseUser", back_populates="sessions")


# ── UserTrustedDevice ─────────────────────────────────────────────────────────

class UserTrustedDevice(BaseModel):
    """Fingerprinted trusted devices per user."""
    __tablename__ = "user_trusted_devices"

    enterprise_user_id  = Column(String(36), ForeignKey("enterprise_users.id"), nullable=False, index=True)
    device_fingerprint  = Column(String(255), nullable=False, index=True)
    device_name         = Column(String(255), nullable=True)
    browser             = Column(String(100), nullable=True)
    os                  = Column(String(100), nullable=True)
    ip_address          = Column(String(45),  nullable=True)
    is_trusted          = Column(Boolean, default=True)
    is_blocked          = Column(Boolean, default=False)
    first_seen_at       = Column(DateTime, default=datetime.utcnow)
    last_seen_at        = Column(DateTime, default=datetime.utcnow)
    revoked_at          = Column(DateTime, nullable=True)
    revoked_by_id       = Column(String(36), ForeignKey("users.id"), nullable=True)

    enterprise_user     = relationship("EnterpriseUser", back_populates="trusted_devices")
    revoked_by          = relationship("User", foreign_keys=[revoked_by_id])


# ── UserLoginHistory ──────────────────────────────────────────────────────────

class UserLoginHistory(BaseModel):
    """Login/logout audit events."""
    __tablename__ = "user_login_history"

    enterprise_user_id  = Column(String(36), ForeignKey("enterprise_users.id"), nullable=False, index=True)
    event_type          = Column(String(30),  nullable=False)   # login/logout/failed
    ip_address          = Column(String(45),  nullable=True)
    device_fingerprint  = Column(String(255), nullable=True)
    device_name         = Column(String(255), nullable=True)
    browser             = Column(String(100), nullable=True)
    os                  = Column(String(100), nullable=True)
    user_agent          = Column(Text,        nullable=True)
    location            = Column(JSON,        nullable=True)
    success             = Column(Boolean,     nullable=False, default=True)
    failure_reason      = Column(String(255), nullable=True)
    session_id          = Column(String(36),  ForeignKey("user_sessions.id"), nullable=True)

    enterprise_user     = relationship("EnterpriseUser", back_populates="login_history")


# ── UserActivityLog ───────────────────────────────────────────────────────────

class UserActivityLog(BaseModel):
    """Identity lifecycle audit trail."""
    __tablename__ = "user_activity_logs"

    enterprise_user_id  = Column(String(36), ForeignKey("enterprise_users.id"), nullable=False, index=True)
    event_type          = Column(String(50),  nullable=False, index=True)   # ActivityEventType
    description         = Column(Text,        nullable=True)
    event_metadata      = Column(JSON,        nullable=True)   # old_value, new_value, etc.
    performed_by_id     = Column(String(36), ForeignKey("users.id"), nullable=True)
    ip_address          = Column(String(45),  nullable=True)

    enterprise_user     = relationship("EnterpriseUser", back_populates="activity_logs")
    performed_by        = relationship("User", foreign_keys=[performed_by_id])


# ── UserApprovalRequest ───────────────────────────────────────────────────────

class UserApprovalRequest(BaseModel):
    """Approval workflow for sensitive identity changes."""
    __tablename__ = "user_approval_requests"

    enterprise_user_id  = Column(String(36), ForeignKey("enterprise_users.id"), nullable=False, index=True)
    approval_type       = Column(String(50),  nullable=False, index=True)   # ApprovalType
    status              = Column(String(20),  nullable=False, default=ApprovalStatus.PENDING.value, index=True)
    requested_by_id     = Column(String(36), ForeignKey("users.id"), nullable=False)
    reviewed_by_id      = Column(String(36), ForeignKey("users.id"), nullable=True)
    requested_at        = Column(DateTime, default=datetime.utcnow)
    reviewed_at         = Column(DateTime, nullable=True)
    reason              = Column(Text,  nullable=True)
    review_note         = Column(Text,  nullable=True)
    payload             = Column(JSON,  nullable=True)   # change request data

    enterprise_user     = relationship("EnterpriseUser", foreign_keys=[enterprise_user_id])
    requested_by        = relationship("User", foreign_keys=[requested_by_id])
    reviewed_by         = relationship("User", foreign_keys=[reviewed_by_id])
