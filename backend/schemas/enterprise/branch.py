"""
schemas/enterprise/branch.py
─────────────────────────────
Pydantic v2 schemas for the Enterprise Branch Management module.

Hierarchy:
  BranchBase          — shared fields
  BranchCreate        — creation payload
  BranchUpdate        — partial update (all optional)
  BranchResponse      — full response (includes computed/joined fields)
  BranchListResponse  — paginated list wrapper
  BranchStatsResponse — real-time performance metrics per branch
  BranchComparison*   — comparison payload & response
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


# ── Nested setting schemas ─────────────────────────────────────────────────────

class DaySchedule(BaseModel):
    open: str = "09:00"          # HH:MM
    close: str = "21:00"
    is_closed: bool = False

class OperationalSettings(BaseModel):
    working_hours: Optional[Dict[str, DaySchedule]] = None   # key = "monday" … "sunday"
    weekly_holidays: Optional[List[str]] = None              # e.g. ["sunday"]
    emergency_contact: Optional[Dict[str, str]] = None       # {name, phone, relationship}
    tax_settings: Optional[Dict[str, Any]] = None            # {gst_rate, pst_rate, ...}

class GpsVerification(BaseModel):
    enabled: bool = False
    radius_meters: int = 100

class SecuritySettings(BaseModel):
    ip_whitelist: Optional[List[str]] = None
    device_restrictions: Optional[List[str]] = None          # ["mobile","desktop","tablet"]
    gps_verification: Optional[GpsVerification] = None
    allowed_locations: Optional[List[Dict[str, Any]]] = None # [{lat, lng, name}]
    access_policies: Optional[Dict[str, Any]] = None         # {require_2fa: false, ...}


# ── Core branch schemas ────────────────────────────────────────────────────────

class BranchBase(BaseModel):
    # Core
    name:            str = Field(..., min_length=2, max_length=255)
    code:            str = Field(..., min_length=1, max_length=50)
    type:            str = Field(default="retail_branch")
    status:          str = Field(default="active")
    logo:            Optional[str] = None

    # Contact
    email:           Optional[str] = None
    phone:           Optional[str] = None
    alternate_phone: Optional[str] = None

    # Location
    country:         Optional[str] = "Pakistan"
    province:        Optional[str] = None
    region:          Optional[str] = None
    city:            Optional[str] = None
    address:         Optional[str] = None
    postal_code:     Optional[str] = None
    latitude:        Optional[float] = None
    longitude:       Optional[float] = None

    # Manager (denormalized)
    manager_name:       Optional[str] = None
    manager_email:      Optional[str] = None
    manager_phone:      Optional[str] = None
    manager_user_id:    Optional[str] = None
    pharmacist_user_id: Optional[str] = None

    # Licensing
    drug_license_number: Optional[str] = None
    drug_license_expiry: Optional[date] = None
    tax_number:          Optional[str] = None

    # Business
    opening_date:   Optional[date] = None
    timezone:       Optional[str] = "Asia/Karachi"
    currency:       Optional[str] = "PKR"
    notes:          Optional[str] = None
    theme_color:    Optional[str] = "#6366f1"
    invoice_prefix: Optional[str] = None
    receipt_footer: Optional[str] = None
    sort_order:     Optional[int] = 0
    legacy_branch_id: Optional[str] = None  # links to POS/JWT branch_id for stats queries

    # Operational & Security (nested)
    working_hours:      Optional[Dict[str, Any]] = None
    weekly_holidays:    Optional[List[str]] = None
    emergency_contact:  Optional[Dict[str, Any]] = None
    tax_settings:       Optional[Dict[str, Any]] = None
    security_settings:  Optional[Dict[str, Any]] = None

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        allowed = {
            "head_office", "main_branch", "retail_branch", "warehouse",
            "distribution_center", "franchise_branch", "online_branch", "temporary_branch",
        }
        if v not in allowed:
            raise ValueError(f"Invalid branch type '{v}'. Allowed: {allowed}")
        return v

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        allowed = {"active", "inactive", "under_construction", "suspended", "closed", "maintenance"}
        if v not in allowed:
            raise ValueError(f"Invalid status '{v}'. Allowed: {allowed}")
        return v

    @field_validator("theme_color")
    @classmethod
    def validate_hex_color(cls, v: Optional[str]) -> Optional[str]:
        if v and not v.startswith("#"):
            raise ValueError("theme_color must be a hex color (e.g. #6366f1)")
        return v


class BranchCreate(BranchBase):
    """Payload for POST /enterprise/branches"""
    pass


class BranchUpdate(BaseModel):
    """
    PATCH payload — every field is optional.
    Only set fields are persisted.
    """
    name:            Optional[str] = None
    code:            Optional[str] = None
    type:            Optional[str] = None
    status:          Optional[str] = None
    logo:            Optional[str] = None
    email:           Optional[str] = None
    phone:           Optional[str] = None
    alternate_phone: Optional[str] = None
    country:         Optional[str] = None
    province:        Optional[str] = None
    region:          Optional[str] = None
    city:            Optional[str] = None
    address:         Optional[str] = None
    postal_code:     Optional[str] = None
    latitude:        Optional[float] = None
    longitude:       Optional[float] = None
    manager_name:       Optional[str] = None
    manager_email:      Optional[str] = None
    manager_phone:      Optional[str] = None
    manager_user_id:    Optional[str] = None
    pharmacist_user_id: Optional[str] = None
    drug_license_number: Optional[str] = None
    drug_license_expiry: Optional[date] = None
    tax_number:          Optional[str] = None
    opening_date:   Optional[date] = None
    timezone:       Optional[str] = None
    currency:       Optional[str] = None
    notes:          Optional[str] = None
    theme_color:    Optional[str] = None
    invoice_prefix: Optional[str] = None
    receipt_footer: Optional[str] = None
    sort_order:     Optional[int] = None
    health_score:   Optional[float] = None
    working_hours:     Optional[Dict[str, Any]] = None
    weekly_holidays:   Optional[List[str]] = None
    emergency_contact: Optional[Dict[str, Any]] = None
    tax_settings:      Optional[Dict[str, Any]] = None
    security_settings: Optional[Dict[str, Any]] = None
    legacy_branch_id:  Optional[str] = None


class BranchStaffInfo(BaseModel):
    """Minimal user info embedded in branch responses."""
    id: str
    username: str
    full_name: Optional[str] = None
    email: Optional[str] = None
    is_active: bool

    class Config:
        from_attributes = True


class BranchResponse(BranchBase):
    """Full branch response — returned on GET /branches and GET /branches/{id}"""
    id:         str
    pharmacy_id: Optional[str] = None
    health_score: Optional[float] = 100.0
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    # Computed / joined
    staff_count: int = 0
    manager_info: Optional[BranchStaffInfo] = None

    class Config:
        from_attributes = True


class BranchListResponse(BaseModel):
    """Paginated list wrapper."""
    items:   List[BranchResponse]
    total:   int
    page:    int
    limit:   int
    pages:   int


# ── Staff assignment schemas ───────────────────────────────────────────────────

class BranchStaffAssignmentCreate(BaseModel):
    user_id: str
    role: str = "staff"    # manager | pharmacist | cashier | supervisor | staff
    notes: Optional[str] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: str) -> str:
        allowed = {"manager", "pharmacist", "cashier", "supervisor", "staff"}
        if v not in allowed:
            raise ValueError(f"Invalid role '{v}'")
        return v


class BranchStaffAssignmentResponse(BaseModel):
    id:         str
    branch_id:  str
    user_id:    str
    role:       str
    is_active:  bool
    assigned_at: Optional[datetime] = None
    notes:      Optional[str] = None
    user:       Optional[BranchStaffInfo] = None

    class Config:
        from_attributes = True


# ── Performance metrics schema ─────────────────────────────────────────────────

class BranchStatsResponse(BaseModel):
    """
    Real-time / cached performance metrics for a branch.
    Computed by querying sales, inventory, and HR tables.
    Fields are Optional so partial data can be returned gracefully.
    """
    branch_id: str
    branch_name: str

    # Sales
    total_sales:       Optional[float] = 0.0
    monthly_sales:     Optional[float] = 0.0
    daily_sales:       Optional[float] = 0.0
    total_profit:      Optional[float] = 0.0
    monthly_profit:    Optional[float] = 0.0
    aov:               Optional[float] = 0.0

    # CRM
    total_customers:   Optional[int] = 0
    total_prescriptions: Optional[int] = 0

    # Inventory
    inventory_value:   Optional[float] = 0.0
    low_stock_count:   Optional[int] = 0
    expiry_count:      Optional[int] = 0

    # HR
    staff_count:       Optional[int] = 0
    active_staff:      Optional[int] = 0

    # Health
    health_score:      Optional[float] = 100.0
    license_days_remaining: Optional[int] = None   # drug_license_expiry delta

    # New Features for Dashboard
    top_low_stock:     Optional[List[dict]] = None
    recent_activity:   Optional[List[dict]] = None
    active_cashier:    Optional[str] = None
    trend_data:        Optional[List[dict]] = None
    top_items:         Optional[List[dict]] = None


# ── Comparison schema ─────────────────────────────────────────────────────────

class BranchComparisonRequest(BaseModel):
    branch_ids: List[str] = Field(..., min_length=2, max_length=6)
    period: str = "monthly"    # daily | weekly | monthly | yearly


class BranchComparisonResponse(BaseModel):
    branches:   List[BranchStatsResponse]
    period:     str
    generated_at: datetime
