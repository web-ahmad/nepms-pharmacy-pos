"""
models/enterprise/branch.py
───────────────────────────
Enterprise Multi-Branch Management Domain Models.

PharmacyBranch  — full branch entity (scoped to a Pharmacy via pharmacy_id)
BranchStaffAssignment — links Users to branches with roles (manager, pharmacist, cashier, staff)

Design rules
────────────
• Uses BaseModel → inherits id (UUID), pharmacy_id, tenant_id, is_deleted, sync_version,
  created_at, updated_at automatically.
• All JSON columns use SQLite-compatible JSON type.
• No foreign keys to the legacy Branch table.
• Soft-delete only (is_deleted = True).
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey,
    Integer, JSON, String, Text,
)
from sqlalchemy.orm import relationship

from models.base import BaseModel


# ── Enumerations ──────────────────────────────────────────────────────────────

class BranchType(str, enum.Enum):
    HEAD_OFFICE          = "head_office"
    MAIN_BRANCH          = "main_branch"
    RETAIL_BRANCH        = "retail_branch"
    WAREHOUSE            = "warehouse"
    DISTRIBUTION_CENTER  = "distribution_center"
    FRANCHISE_BRANCH     = "franchise_branch"
    ONLINE_BRANCH        = "online_branch"
    TEMPORARY_BRANCH     = "temporary_branch"


class BranchStatus(str, enum.Enum):
    ACTIVE               = "active"
    INACTIVE             = "inactive"
    UNDER_CONSTRUCTION   = "under_construction"
    SUSPENDED            = "suspended"
    CLOSED               = "closed"
    MAINTENANCE          = "maintenance"


class StaffRole(str, enum.Enum):
    MANAGER              = "manager"
    PHARMACIST           = "pharmacist"
    CASHIER              = "cashier"
    STAFF                = "staff"
    SUPERVISOR           = "supervisor"


# ── PharmacyBranch ────────────────────────────────────────────────────────────

class PharmacyBranch(BaseModel):
    """
    Core enterprise branch entity.

    Scoped to pharmacy via pharmacy_id (from BaseModel).
    Supports 8 branch types, 6 status values, full address, licensing,
    operational settings (JSON), and security policies (JSON).
    """
    __tablename__ = "pharmacy_branches"

    # ── Core identity ─────────────────────────────────────────────────────────
    name            = Column(String(255), nullable=False, index=True)
    code            = Column(String(50),  nullable=False, index=True)       # unique per pharmacy
    type            = Column(String(50),  nullable=False, default=BranchType.RETAIL_BRANCH.value, index=True)
    status          = Column(String(50),  nullable=False, default=BranchStatus.ACTIVE.value, index=True)
    logo            = Column(Text,        nullable=True)                     # URL or base64

    # ── Contact ───────────────────────────────────────────────────────────────
    email           = Column(String(255), nullable=True)
    phone           = Column(String(50),  nullable=True)
    alternate_phone = Column(String(50),  nullable=True)

    # ── Location ──────────────────────────────────────────────────────────────
    country         = Column(String(100), nullable=True, default="Pakistan")
    province        = Column(String(100), nullable=True)
    region          = Column(String(100), nullable=True, index=True)        # for region filter
    city            = Column(String(100), nullable=True, index=True)
    address         = Column(Text,        nullable=True)
    postal_code     = Column(String(20),  nullable=True)
    latitude        = Column(Float,       nullable=True)
    longitude       = Column(Float,       nullable=True)

    # ── Manager quick-access ──────────────────────────────────────────────────
    # Denormalized for fast list rendering — source of truth is BranchStaffAssignment
    manager_name        = Column(String(255), nullable=True)
    manager_email       = Column(String(255), nullable=True)
    manager_phone       = Column(String(50),  nullable=True)
    manager_user_id     = Column(String(36), ForeignKey("users.id"), nullable=True)
    pharmacist_user_id  = Column(String(36), ForeignKey("users.id"), nullable=True)

    # ── Licensing & compliance ─────────────────────────────────────────────────
    drug_license_number = Column(String(100), nullable=True)
    drug_license_expiry = Column(Date,        nullable=True)
    tax_number          = Column(String(100), nullable=True)                 # NTN / GST

    # ── Business settings ─────────────────────────────────────────────────────
    opening_date    = Column(Date,        nullable=True)
    timezone        = Column(String(50),  nullable=True, default="Asia/Karachi")
    currency        = Column(String(10),  nullable=True, default="PKR")
    notes           = Column(Text,        nullable=True)
    theme_color     = Column(String(20),  nullable=True, default="#6366f1")  # hex color
    invoice_prefix  = Column(String(20),  nullable=True)
    receipt_footer  = Column(Text,        nullable=True)

    # ── Operational settings (JSON) ───────────────────────────────────────────
    # working_hours: {monday: {open: "09:00", close: "21:00", is_closed: false}, ...}
    working_hours       = Column(JSON, nullable=True)
    # weekly_holidays: ["sunday"] or ["sunday","saturday"]
    weekly_holidays     = Column(JSON, nullable=True)
    # emergency_contact: {name, phone, relationship}
    emergency_contact   = Column(JSON, nullable=True)
    # tax_settings: {gst_rate: 17, pst_rate: 0, ...}
    tax_settings        = Column(JSON, nullable=True)

    # ── Security settings (JSON) ──────────────────────────────────────────────
    # {
    #   ip_whitelist: ["192.168.1.0/24"],
    #   device_restrictions: ["mobile"],
    #   gps_verification: {enabled: true, radius_meters: 100},
    #   allowed_locations: [{lat, lng, name}],
    #   access_policies: {require_2fa: false}
    # }
    security_settings   = Column(JSON, nullable=True)

    # ── Health / metrics ──────────────────────────────────────────────────────
    health_score        = Column(Float,   nullable=True, default=100.0)     # 0-100, recomputed nightly
    sort_order          = Column(Integer, nullable=True, default=0)

    # ── ORM relationships ─────────────────────────────────────────────────────
    manager             = relationship("User", foreign_keys=[manager_user_id])
    pharmacist          = relationship("User", foreign_keys=[pharmacist_user_id])
    staff_assignments   = relationship(
        "BranchStaffAssignment",
        back_populates="branch",
        cascade="all, delete-orphan",
    )


# ── BranchStaffAssignment ─────────────────────────────────────────────────────

class BranchStaffAssignment(BaseModel):
    """
    Many-to-many between PharmacyBranch and Users with a role qualifier.
    Supports: manager, pharmacist, cashier, supervisor, staff.
    """
    __tablename__ = "branch_staff_assignments"

    branch_id   = Column(String(36), ForeignKey("pharmacy_branches.id"), nullable=False, index=True)
    user_id     = Column(String(36), ForeignKey("users.id"),             nullable=False, index=True)
    role        = Column(String(50), nullable=False, default=StaffRole.STAFF.value)
    is_active   = Column(Boolean,   default=True)
    assigned_at = Column(DateTime,  default=datetime.utcnow)
    notes       = Column(Text,      nullable=True)

    branch  = relationship("PharmacyBranch", back_populates="staff_assignments")
    user    = relationship("User")
