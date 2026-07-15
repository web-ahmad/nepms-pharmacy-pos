"""
models/enterprise/branch_configuration.py
──────────────────────────────────────────
Phase 3 — Enterprise Branch Operations & Configuration Domain Models.

20 models covering every aspect of branch configuration:
  BranchConfiguration       — master settings per branch
  BranchWorkingHours        — day-by-day schedule
  BranchHoliday             — recurring + one-off holidays
  BranchWarehouse           — sub-warehouses with capacity
  BranchCounter             — POS counters
  BranchPrinter             — network/USB printers
  BranchDevice              — registered tablets/PCs
  BranchDocumentSeries      — per-document-type invoice numbering
  BranchTaxSetting          — multi-rate tax registry
  BranchPreference          — key-value preference store
  BranchLicense             — drug license & regulatory docs
  BranchFinancialAccount    — cash/bank/payment accounts
  BranchPaymentMethod       — enabled payment methods
  BranchNotificationSetting — per-event notification preferences
  BranchBranding            — logo, colors, signatures
  BranchPosConfig           — POS peripheral configuration
  BranchSecuritySetting     — IP/GPS/session security
  BranchBackupSetting       — backup schedule & storage
  BranchConfigAuditLog      — audit trail for all config changes
  BranchHealthSnapshot      — nightly health KPI snapshot

Design rules
────────────
• All models inherit BaseModel → pharmacy_id, is_deleted, sync_version,
  created_at, updated_at.
• branch_id FK references pharmacy_branches.id (string, not integer).
• JSON columns used only for flexible arrays/dicts (not as source of truth).
• Soft-delete only (is_deleted = True).
• No circular FK imports — FKs use table-name strings.
"""

from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import (
    Boolean, Column, Date, DateTime, Float, ForeignKey,
    Integer, JSON, String, Text, UniqueConstraint,
)
from sqlalchemy.orm import relationship

from models.base import BaseModel


# ── Enumerations ──────────────────────────────────────────────────────────────

class DayOfWeek(str, enum.Enum):
    MONDAY    = "monday"
    TUESDAY   = "tuesday"
    WEDNESDAY = "wednesday"
    THURSDAY  = "thursday"
    FRIDAY    = "friday"
    SATURDAY  = "saturday"
    SUNDAY    = "sunday"


class HolidayType(str, enum.Enum):
    PUBLIC    = "public"
    RELIGIOUS = "religious"
    COMPANY   = "company"
    EMERGENCY = "emergency"
    OTHER     = "other"


class PrinterType(str, enum.Enum):
    THERMAL   = "thermal"
    LASER     = "laser"
    INKJET    = "inkjet"
    LABEL     = "label"
    DOT_MATRIX = "dot_matrix"


class DeviceType(str, enum.Enum):
    DESKTOP   = "desktop"
    LAPTOP    = "laptop"
    TABLET    = "tablet"
    POS_TERMINAL = "pos_terminal"
    BARCODE_SCANNER = "barcode_scanner"
    CASH_DRAWER = "cash_drawer"
    CUSTOMER_DISPLAY = "customer_display"
    WEIGHING_SCALE = "weighing_scale"
    OTHER     = "other"


class WarehouseType(str, enum.Enum):
    MAIN      = "main"
    COLD      = "cold"
    CONTROLLED = "controlled"       # narcotics / scheduled drugs
    RETURNS   = "returns"
    QUARANTINE = "quarantine"
    OTHER     = "other"


class DocumentType(str, enum.Enum):
    SALE_INVOICE      = "sale_invoice"
    PURCHASE_INVOICE  = "purchase_invoice"
    SALE_RETURN       = "sale_return"
    PURCHASE_RETURN   = "purchase_return"
    QUOTATION         = "quotation"
    PRESCRIPTION      = "prescription"
    STOCK_TRANSFER    = "stock_transfer"
    STOCK_ADJUSTMENT  = "stock_adjustment"
    EXPENSE_VOUCHER   = "expense_voucher"
    PAYMENT_VOUCHER   = "payment_voucher"
    RECEIPT_VOUCHER   = "receipt_voucher"


class TaxType(str, enum.Enum):
    GST       = "gst"
    PST       = "pst"
    FEDERAL   = "federal"
    CUSTOM    = "custom"
    EXEMPT    = "exempt"


class LicenseStatus(str, enum.Enum):
    ACTIVE    = "active"
    EXPIRED   = "expired"
    SUSPENDED = "suspended"
    PENDING   = "pending"
    RENEWAL   = "renewal"


class FinancialAccountType(str, enum.Enum):
    CASH      = "cash"
    BANK      = "bank"
    EASYPAISA = "easypaisa"
    JAZZCASH  = "jazzcash"
    CREDIT    = "credit"
    INSURANCE = "insurance"
    OTHER     = "other"


class PaymentMethodType(str, enum.Enum):
    CASH        = "cash"
    CARD        = "card"
    BANK        = "bank_transfer"
    EASYPAISA   = "easypaisa"
    JAZZCASH    = "jazzcash"
    INSURANCE   = "insurance"
    CREDIT      = "credit_customer"
    CHEQUE      = "cheque"
    OTHER       = "other"


class NotificationEvent(str, enum.Enum):
    LOW_STOCK        = "low_stock"
    NEAR_EXPIRY      = "near_expiry"
    OUT_OF_STOCK     = "out_of_stock"
    DAILY_SALES      = "daily_sales"
    PURCHASE_DONE    = "purchase_completed"
    BACKUP_FAILED    = "backup_failed"
    LICENSE_EXPIRY   = "license_expiry"
    DEVICE_OFFLINE   = "device_offline"
    PRINTER_OFFLINE  = "printer_offline"
    SYSTEM_ERROR     = "system_error"
    USER_LOGIN       = "user_login"
    HIGH_DISCOUNT    = "high_discount"


class ResetPolicy(str, enum.Enum):
    NEVER     = "never"
    DAILY     = "daily"
    MONTHLY   = "monthly"
    YEARLY    = "yearly"


class ConfigAuditAction(str, enum.Enum):
    CREATED   = "created"
    UPDATED   = "updated"
    DELETED   = "deleted"
    ACTIVATED = "activated"
    DEACTIVATED = "deactivated"


# ── 1. BranchConfiguration ────────────────────────────────────────────────────

class BranchConfiguration(BaseModel):
    """
    Master configuration record — one per branch.
    Replaces the legacy working_hours / tax_settings JSON blobs on PharmacyBranch.
    """
    __tablename__ = "branch_configurations"

    branch_id           = Column(String(36), ForeignKey("pharmacy_branches.id"), nullable=False, unique=True, index=True)

    # Business identity
    display_name        = Column(String(255), nullable=True)
    tagline             = Column(String(500), nullable=True)
    timezone            = Column(String(50),  nullable=False, default="Asia/Karachi")
    currency            = Column(String(10),  nullable=False, default="PKR")
    language            = Column(String(10),  nullable=False, default="en")
    country_code        = Column(String(5),   nullable=False, default="PK")

    # Barcode
    barcode_format      = Column(String(30),  nullable=True, default="CODE128")  # CODE128, EAN13, QR
    barcode_prefix      = Column(String(20),  nullable=True)
    barcode_auto_generate = Column(Boolean,   default=True)

    # POS general
    allow_negative_stock = Column(Boolean,    default=False)
    require_batch_on_sale = Column(Boolean,   default=True)
    auto_calc_expiry_warning_days = Column(Integer, default=90)
    low_stock_threshold  = Column(Integer,    default=10)

    # Receipt / invoice
    receipt_header      = Column(Text,        nullable=True)
    receipt_footer      = Column(Text,        nullable=True)
    show_logo_on_receipt = Column(Boolean,    default=True)
    show_barcode_on_receipt = Column(Boolean, default=False)

    # Misc
    is_fully_configured = Column(Boolean,     default=False)   # onboarding flag
    config_version      = Column(Integer,     default=1)       # bump on save
    notes               = Column(Text,        nullable=True)

    # Relationship
    branch              = relationship("PharmacyBranch", foreign_keys=[branch_id])


# ── 2. BranchWorkingHours ─────────────────────────────────────────────────────

class BranchWorkingHours(BaseModel):
    """
    One row per day of week per branch.
    Source of truth replaces PharmacyBranch.working_hours JSON blob.
    """
    __tablename__ = "branch_working_hours"
    __table_args__ = (
        UniqueConstraint("branch_id", "day_of_week", name="uq_branch_day"),
    )

    branch_id           = Column(String(36), ForeignKey("pharmacy_branches.id"), nullable=False, index=True)
    day_of_week         = Column(String(20), nullable=False)          # DayOfWeek enum value
    is_closed           = Column(Boolean,    default=False)
    open_time           = Column(String(10), nullable=True)           # "09:00"
    close_time          = Column(String(10), nullable=True)           # "21:00"
    break_start         = Column(String(10), nullable=True)
    break_end           = Column(String(10), nullable=True)
    notes               = Column(Text,       nullable=True)

    branch              = relationship("PharmacyBranch", foreign_keys=[branch_id])


# ── 3. BranchHoliday ─────────────────────────────────────────────────────────

class BranchHoliday(BaseModel):
    """One-off or recurring branch holiday."""
    __tablename__ = "branch_holidays"

    branch_id           = Column(String(36), ForeignKey("pharmacy_branches.id"), nullable=False, index=True)
    name                = Column(String(255), nullable=False)
    holiday_date        = Column(Date,        nullable=False)
    holiday_type        = Column(String(30),  nullable=False, default=HolidayType.PUBLIC.value)
    is_recurring        = Column(Boolean,     default=False)  # repeat every year on same date
    description         = Column(Text,        nullable=True)
    is_active           = Column(Boolean,     default=True)

    branch              = relationship("PharmacyBranch", foreign_keys=[branch_id])


# ── 4. BranchWarehouse ───────────────────────────────────────────────────────

class BranchWarehouse(BaseModel):
    """Sub-warehouse within a branch."""
    __tablename__ = "branch_warehouses"

    branch_id           = Column(String(36), ForeignKey("pharmacy_branches.id"), nullable=False, index=True)
    name                = Column(String(255), nullable=False)
    code                = Column(String(50),  nullable=False)
    warehouse_type      = Column(String(30),  nullable=False, default=WarehouseType.MAIN.value)
    is_default          = Column(Boolean,     default=False)
    is_active           = Column(Boolean,     default=True)
    capacity_units      = Column(Integer,     nullable=True)   # max SKUs or units
    current_units       = Column(Integer,     nullable=True, default=0)
    location_description = Column(Text,       nullable=True)
    temperature_min     = Column(Float,       nullable=True)
    temperature_max     = Column(Float,       nullable=True)
    notes               = Column(Text,        nullable=True)

    branch              = relationship("PharmacyBranch", foreign_keys=[branch_id])


# ── 5. BranchCounter ─────────────────────────────────────────────────────────

class BranchCounter(BaseModel):
    """POS counter / terminal within a branch."""
    __tablename__ = "branch_counters"

    branch_id           = Column(String(36), ForeignKey("pharmacy_branches.id"), nullable=False, index=True)
    name                = Column(String(255), nullable=False)
    code                = Column(String(50),  nullable=False)
    ip_address          = Column(String(50),  nullable=True)
    mac_address         = Column(String(50),  nullable=True)
    default_printer_id  = Column(String(36),  ForeignKey("branch_printers.id"), nullable=True)
    default_warehouse_id = Column(String(36), ForeignKey("branch_warehouses.id"), nullable=True)
    is_active           = Column(Boolean,     default=True)
    notes               = Column(Text,        nullable=True)

    branch              = relationship("PharmacyBranch", foreign_keys=[branch_id])
    default_printer     = relationship("BranchPrinter",   foreign_keys=[default_printer_id])
    default_warehouse   = relationship("BranchWarehouse", foreign_keys=[default_warehouse_id])


# ── 6. BranchPrinter ─────────────────────────────────────────────────────────

class BranchPrinter(BaseModel):
    """Network or USB printer registered to a branch."""
    __tablename__ = "branch_printers"

    branch_id           = Column(String(36), ForeignKey("pharmacy_branches.id"), nullable=False, index=True)
    name                = Column(String(255), nullable=False)
    printer_type        = Column(String(30),  nullable=False, default=PrinterType.THERMAL.value)
    connection_type     = Column(String(20),  nullable=True, default="network")   # network, usb, bluetooth
    ip_address          = Column(String(50),  nullable=True)
    port                = Column(Integer,     nullable=True, default=9100)
    usb_path            = Column(String(255), nullable=True)
    is_default          = Column(Boolean,     default=False)
    is_active           = Column(Boolean,     default=True)
    paper_size          = Column(String(20),  nullable=True, default="80mm")
    copies              = Column(Integer,     default=1)
    notes               = Column(Text,        nullable=True)

    branch              = relationship("PharmacyBranch", foreign_keys=[branch_id])


# ── 7. BranchDevice ──────────────────────────────────────────────────────────

class BranchDevice(BaseModel):
    """Registered hardware device at a branch."""
    __tablename__ = "branch_devices"

    branch_id           = Column(String(36), ForeignKey("pharmacy_branches.id"), nullable=False, index=True)
    device_name         = Column(String(255), nullable=False)
    device_type         = Column(String(40),  nullable=False, default=DeviceType.DESKTOP.value)
    mac_address         = Column(String(50),  nullable=True, unique=True)
    ip_address          = Column(String(50),  nullable=True)
    os                  = Column(String(100), nullable=True)
    browser             = Column(String(100), nullable=True)
    serial_number       = Column(String(100), nullable=True)
    registered_by_id    = Column(String(36),  ForeignKey("users.id"), nullable=True)
    is_registered       = Column(Boolean,     default=False)
    is_active           = Column(Boolean,     default=True)
    is_trusted          = Column(Boolean,     default=False)
    last_seen_at        = Column(DateTime,    nullable=True)
    notes               = Column(Text,        nullable=True)

    branch              = relationship("PharmacyBranch", foreign_keys=[branch_id])


# ── 8. BranchDocumentSeries ──────────────────────────────────────────────────

class BranchDocumentSeries(BaseModel):
    """
    Per-document-type invoice/voucher numbering sequence.
    Replaces the single invoice_prefix / invoice_number fields.
    """
    __tablename__ = "branch_document_series"
    __table_args__ = (
        UniqueConstraint("branch_id", "document_type", name="uq_branch_doc_type"),
    )

    branch_id           = Column(String(36), ForeignKey("pharmacy_branches.id"), nullable=False, index=True)
    document_type       = Column(String(50), nullable=False)          # DocumentType enum value
    prefix              = Column(String(20), nullable=True)            # e.g. "INV-"
    suffix              = Column(String(20), nullable=True)
    next_number         = Column(Integer,    nullable=False, default=1)
    padding             = Column(Integer,    nullable=False, default=5) # zero-pad to N digits
    reset_policy        = Column(String(20), nullable=False, default=ResetPolicy.NEVER.value)
    format_template     = Column(String(100), nullable=True)           # "{prefix}{year}-{number}{suffix}"
    last_reset_at       = Column(DateTime,   nullable=True)
    is_active           = Column(Boolean,    default=True)
    notes               = Column(Text,       nullable=True)

    branch              = relationship("PharmacyBranch", foreign_keys=[branch_id])


# ── 9. BranchTaxSetting ──────────────────────────────────────────────────────

class BranchTaxSetting(BaseModel):
    """Tax rate registry per branch. Replaces PharmacyBranch.tax_settings JSON."""
    __tablename__ = "branch_tax_settings"

    branch_id           = Column(String(36), ForeignKey("pharmacy_branches.id"), nullable=False, index=True)
    tax_name            = Column(String(100), nullable=False)
    tax_type            = Column(String(30),  nullable=False, default=TaxType.GST.value)
    rate                = Column(Float,       nullable=False, default=0.0)
    is_default          = Column(Boolean,     default=False)
    is_compound         = Column(Boolean,     default=False)   # calculated on top of other taxes
    is_inclusive        = Column(Boolean,     default=False)   # price already includes tax
    applies_to          = Column(JSON,        nullable=True)    # ["medicines", "supplements", ...]
    tax_account_code    = Column(String(50),  nullable=True)   # ledger integration
    is_active           = Column(Boolean,     default=True)
    notes               = Column(Text,        nullable=True)

    branch              = relationship("PharmacyBranch", foreign_keys=[branch_id])


# ── 10. BranchPreference ─────────────────────────────────────────────────────

class BranchPreference(BaseModel):
    """Key-value preference store — typed and grouped."""
    __tablename__ = "branch_preferences"
    __table_args__ = (
        UniqueConstraint("branch_id", "pref_key", name="uq_branch_pref"),
    )

    branch_id           = Column(String(36), ForeignKey("pharmacy_branches.id"), nullable=False, index=True)
    pref_key            = Column(String(100), nullable=False)
    pref_value          = Column(Text,        nullable=True)
    data_type           = Column(String(20),  nullable=False, default="string")  # string|bool|int|float|json
    category            = Column(String(50),  nullable=True)    # ui, pos, reporting, alerts
    description         = Column(String(255), nullable=True)
    is_system           = Column(Boolean,     default=False)     # system-managed, UI can't delete

    branch              = relationship("PharmacyBranch", foreign_keys=[branch_id])


# ── 11. BranchLicense ────────────────────────────────────────────────────────

class BranchLicense(BaseModel):
    """Regulatory licenses and compliance documents."""
    __tablename__ = "branch_licenses"

    branch_id              = Column(String(36), ForeignKey("pharmacy_branches.id"), nullable=False, index=True)
    license_name           = Column(String(255), nullable=False)
    license_number         = Column(String(100), nullable=True)
    license_type           = Column(String(50),  nullable=False)   # drug, pharmacy_registration, tax, ntn, other
    issuing_authority      = Column(String(255), nullable=True)
    issue_date             = Column(Date,         nullable=True)
    expiry_date            = Column(Date,         nullable=True)
    renewal_reminder_days  = Column(Integer,      nullable=True, default=30)
    status                 = Column(String(30),   nullable=False, default=LicenseStatus.ACTIVE.value)
    attachment_url         = Column(Text,         nullable=True)
    notes                  = Column(Text,         nullable=True)

    branch                 = relationship("PharmacyBranch", foreign_keys=[branch_id])


# ── 12. BranchFinancialAccount ───────────────────────────────────────────────

class BranchFinancialAccount(BaseModel):
    """Cash/bank/digital payment accounts per branch."""
    __tablename__ = "branch_financial_accounts"

    branch_id           = Column(String(36), ForeignKey("pharmacy_branches.id"), nullable=False, index=True)
    account_name        = Column(String(255), nullable=False)
    account_type        = Column(String(30),  nullable=False, default=FinancialAccountType.CASH.value)
    bank_name           = Column(String(255), nullable=True)
    account_number      = Column(String(100), nullable=True)
    iban                = Column(String(50),  nullable=True)
    branch_name         = Column(String(255), nullable=True)   # bank branch name
    opening_balance     = Column(Float,       nullable=True, default=0.0)
    is_default          = Column(Boolean,     default=False)
    is_active           = Column(Boolean,     default=True)
    ledger_account_code = Column(String(50),  nullable=True)   # link to accounts module
    notes               = Column(Text,        nullable=True)

    branch              = relationship("PharmacyBranch", foreign_keys=[branch_id])


# ── 13. BranchPaymentMethod ──────────────────────────────────────────────────

class BranchPaymentMethod(BaseModel):
    """Enabled payment methods at POS per branch."""
    __tablename__ = "branch_payment_methods"

    branch_id           = Column(String(36), ForeignKey("pharmacy_branches.id"), nullable=False, index=True)
    method_type         = Column(String(40),  nullable=False)          # PaymentMethodType enum value
    display_name        = Column(String(100), nullable=True)
    is_enabled          = Column(Boolean,     default=True)
    is_default          = Column(Boolean,     default=False)
    requires_reference  = Column(Boolean,     default=False)
    account_id          = Column(String(36),  ForeignKey("branch_financial_accounts.id"), nullable=True)
    sort_order          = Column(Integer,     default=0)
    notes               = Column(Text,        nullable=True)

    branch              = relationship("PharmacyBranch",        foreign_keys=[branch_id])
    account             = relationship("BranchFinancialAccount", foreign_keys=[account_id])


# ── 14. BranchNotificationSetting ───────────────────────────────────────────

class BranchNotificationSetting(BaseModel):
    """Per-event notification channel configuration."""
    __tablename__ = "branch_notification_settings"
    __table_args__ = (
        UniqueConstraint("branch_id", "event_type", name="uq_branch_notif_event"),
    )

    branch_id           = Column(String(36), ForeignKey("pharmacy_branches.id"), nullable=False, index=True)
    event_type          = Column(String(50),  nullable=False)          # NotificationEvent enum value
    is_enabled          = Column(Boolean,     default=True)
    channel_email       = Column(Boolean,     default=True)
    channel_sms         = Column(Boolean,     default=False)
    channel_whatsapp    = Column(Boolean,     default=False)
    channel_in_app      = Column(Boolean,     default=True)
    recipient_roles     = Column(JSON,        nullable=True)            # ["branch_manager", "pharmacist"]
    threshold_value     = Column(Float,       nullable=True)            # e.g. low_stock_at = 5
    cool_down_minutes   = Column(Integer,     default=60)               # don't repeat within N minutes
    notes               = Column(Text,        nullable=True)

    branch              = relationship("PharmacyBranch", foreign_keys=[branch_id])


# ── 15. BranchBranding ──────────────────────────────────────────────────────

class BranchBranding(BaseModel):
    """Visual identity settings per branch — one row per branch."""
    __tablename__ = "branch_brandings"

    branch_id           = Column(String(36), ForeignKey("pharmacy_branches.id"), nullable=False, unique=True, index=True)
    logo_url            = Column(Text,        nullable=True)
    invoice_logo_url    = Column(Text,        nullable=True)
    receipt_logo_url    = Column(Text,        nullable=True)
    watermark_url       = Column(Text,        nullable=True)
    signature_url       = Column(Text,        nullable=True)
    stamp_url           = Column(Text,        nullable=True)
    theme_color         = Column(String(20),  nullable=True, default="#6366f1")
    accent_color        = Column(String(20),  nullable=True, default="#8b5cf6")
    font_family         = Column(String(100), nullable=True, default="Inter")
    show_watermark      = Column(Boolean,     default=False)
    show_stamp          = Column(Boolean,     default=False)
    show_signature      = Column(Boolean,     default=False)

    branch              = relationship("PharmacyBranch", foreign_keys=[branch_id])


# ── 16. BranchPosConfig ──────────────────────────────────────────────────────

class BranchPosConfig(BaseModel):
    """POS peripheral and behavior configuration — one row per branch."""
    __tablename__ = "branch_pos_configs"

    branch_id               = Column(String(36), ForeignKey("pharmacy_branches.id"), nullable=False, unique=True, index=True)

    # Peripherals
    receipt_printer_id      = Column(String(36), ForeignKey("branch_printers.id"),   nullable=True)
    label_printer_id        = Column(String(36), ForeignKey("branch_printers.id"),   nullable=True)
    barcode_scanner_enabled = Column(Boolean,    default=True)
    cash_drawer_enabled     = Column(Boolean,    default=False)
    cash_drawer_port        = Column(String(100), nullable=True)
    customer_display_enabled = Column(Boolean,   default=False)
    weighing_scale_enabled  = Column(Boolean,    default=False)
    weighing_scale_port     = Column(String(100), nullable=True)

    # Defaults
    default_warehouse_id    = Column(String(36), ForeignKey("branch_warehouses.id"), nullable=True)
    default_counter_id      = Column(String(36), ForeignKey("branch_counters.id"),   nullable=True)

    # Behavior
    auto_print_receipt      = Column(Boolean,    default=True)
    auto_open_cash_drawer   = Column(Boolean,    default=False)
    require_customer_on_sale = Column(Boolean,   default=False)
    allow_hold_sale         = Column(Boolean,    default=True)
    max_hold_sales          = Column(Integer,    default=5)
    discount_limit_percent  = Column(Float,      default=10.0)
    round_total             = Column(Boolean,    default=True)
    round_to                = Column(Float,      default=1.0)

    branch                  = relationship("PharmacyBranch",  foreign_keys=[branch_id])
    receipt_printer         = relationship("BranchPrinter",   foreign_keys=[receipt_printer_id])
    label_printer           = relationship("BranchPrinter",   foreign_keys=[label_printer_id])
    default_warehouse       = relationship("BranchWarehouse", foreign_keys=[default_warehouse_id])
    default_counter         = relationship("BranchCounter",   foreign_keys=[default_counter_id])


# ── 17. BranchSecuritySetting ────────────────────────────────────────────────

class BranchSecuritySetting(BaseModel):
    """Network, session, and access security per branch — one row per branch."""
    __tablename__ = "branch_security_settings"

    branch_id               = Column(String(36), ForeignKey("pharmacy_branches.id"), nullable=False, unique=True, index=True)

    # IP / location
    ip_whitelist_enabled    = Column(Boolean,    default=False)
    ip_whitelist            = Column(JSON,        nullable=True)   # ["192.168.1.0/24", ...]
    gps_restriction_enabled = Column(Boolean,    default=False)
    gps_radius_meters       = Column(Integer,    nullable=True, default=200)
    allowed_locations       = Column(JSON,        nullable=True)   # [{lat, lng, name}]

    # Session
    session_timeout_minutes = Column(Integer,    default=480)      # 8 hours
    max_concurrent_sessions = Column(Integer,    default=5)
    require_2fa             = Column(Boolean,    default=False)
    require_device_registration = Column(Boolean, default=False)

    # Login time restrictions
    login_time_enabled      = Column(Boolean,    default=False)
    login_allowed_from      = Column(String(10), nullable=True)    # "08:00"
    login_allowed_until     = Column(String(10), nullable=True)    # "22:00"
    login_allowed_days      = Column(JSON,       nullable=True)    # ["monday", ...]

    # Password
    password_expiry_days    = Column(Integer,    default=90)
    failed_login_lockout    = Column(Integer,    default=5)        # lock after N fails
    lockout_duration_minutes = Column(Integer,   default=30)

    branch                  = relationship("PharmacyBranch", foreign_keys=[branch_id])


# ── 18. BranchBackupSetting ──────────────────────────────────────────────────

class BranchBackupSetting(BaseModel):
    """Backup schedule and storage configuration — one row per branch."""
    __tablename__ = "branch_backup_settings"

    branch_id               = Column(String(36), ForeignKey("pharmacy_branches.id"), nullable=False, unique=True, index=True)

    auto_backup_enabled     = Column(Boolean,    default=True)
    backup_schedule         = Column(String(50), nullable=True, default="daily")  # daily, weekly, manual
    backup_time             = Column(String(10), nullable=True, default="02:00")  # HH:MM
    retention_days          = Column(Integer,    default=30)

    local_backup_enabled    = Column(Boolean,    default=True)
    local_backup_path       = Column(Text,       nullable=True)

    cloud_backup_enabled    = Column(Boolean,    default=False)
    cloud_provider          = Column(String(50), nullable=True)   # s3, gcs, azure, gdrive
    cloud_bucket            = Column(Text,       nullable=True)
    cloud_credentials       = Column(Text,       nullable=True)   # encrypted JSON

    compress_backup         = Column(Boolean,    default=True)
    encrypt_backup          = Column(Boolean,    default=False)
    encryption_key_hint     = Column(Text,       nullable=True)

    last_backup_at          = Column(DateTime,   nullable=True)
    last_backup_status      = Column(String(30), nullable=True)   # success, failed, running
    last_backup_size_mb     = Column(Float,      nullable=True)

    branch                  = relationship("PharmacyBranch", foreign_keys=[branch_id])


# ── 19. BranchConfigAuditLog ─────────────────────────────────────────────────

class BranchConfigAuditLog(BaseModel):
    """Immutable audit trail for all branch configuration changes."""
    __tablename__ = "branch_config_audit_logs"

    branch_id           = Column(String(36), ForeignKey("pharmacy_branches.id"), nullable=False, index=True)
    module              = Column(String(100), nullable=False)          # e.g. "working_hours", "tax_settings"
    action              = Column(String(30),  nullable=False)          # ConfigAuditAction enum
    record_id           = Column(String(36),  nullable=True)           # affected record id
    field_name          = Column(String(100), nullable=True)
    old_value           = Column(Text,        nullable=True)
    new_value           = Column(Text,        nullable=True)
    performed_by_id     = Column(String(36),  ForeignKey("users.id"), nullable=True)
    ip_address          = Column(String(50),  nullable=True)
    device_name         = Column(String(100), nullable=True)
    summary             = Column(Text,        nullable=True)

    branch              = relationship("PharmacyBranch", foreign_keys=[branch_id])


# ── 20. BranchHealthSnapshot ─────────────────────────────────────────────────

class BranchHealthSnapshot(BaseModel):
    """Nightly health KPI snapshot — queried for the Health Dashboard."""
    __tablename__ = "branch_health_snapshots"

    branch_id               = Column(String(36), ForeignKey("pharmacy_branches.id"), nullable=False, index=True)
    snapshot_date           = Column(Date,        nullable=False)

    # Users & devices
    active_users            = Column(Integer,    default=0)
    active_devices          = Column(Integer,    default=0)
    connected_printers      = Column(Integer,    default=0)
    active_warehouses       = Column(Integer,    default=0)
    active_counters         = Column(Integer,    default=0)

    # Storage & backup
    last_backup_at          = Column(DateTime,   nullable=True)
    last_backup_status      = Column(String(30), nullable=True)
    storage_used_mb         = Column(Float,      default=0.0)

    # Licenses
    licenses_expiring_soon  = Column(Integer,    default=0)   # within 30 days
    licenses_expired        = Column(Integer,    default=0)

    # Configuration completeness
    config_health_score     = Column(Float,      default=0.0)  # 0–100
    missing_configs         = Column(JSON,        nullable=True) # ["tax_settings", ...]

    branch                  = relationship("PharmacyBranch", foreign_keys=[branch_id])
