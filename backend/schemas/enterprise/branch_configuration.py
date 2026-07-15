"""
schemas/enterprise/branch_configuration.py
────────────────────────────────────────────
Pydantic v2 schemas for Phase 3 — Enterprise Branch Operations & Configuration.

All models follow the pattern:
  <Model>Base    — shared fields
  <Model>Create  — creation payload
  <Model>Update  — partial update (all Optional)
  <Model>Read    — full response with id, created_at, updated_at
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


# ── Helpers ───────────────────────────────────────────────────────────────────

class ConfigRead(BaseModel):
    id: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
#  1. BranchConfiguration
# ══════════════════════════════════════════════════════════════════════════════

class BranchConfigurationUpdate(BaseModel):
    display_name:                Optional[str]  = None
    tagline:                     Optional[str]  = None
    timezone:                    Optional[str]  = None
    currency:                    Optional[str]  = None
    language:                    Optional[str]  = None
    country_code:                Optional[str]  = None
    barcode_format:              Optional[str]  = None
    barcode_prefix:              Optional[str]  = None
    barcode_auto_generate:       Optional[bool] = None
    allow_negative_stock:        Optional[bool] = None
    require_batch_on_sale:       Optional[bool] = None
    auto_calc_expiry_warning_days: Optional[int] = None
    low_stock_threshold:         Optional[int]  = None
    receipt_header:              Optional[str]  = None
    receipt_footer:              Optional[str]  = None
    show_logo_on_receipt:        Optional[bool] = None
    show_barcode_on_receipt:     Optional[bool] = None
    notes:                       Optional[str]  = None


class BranchConfigurationRead(ConfigRead):
    branch_id:                   str
    display_name:                Optional[str]  = None
    tagline:                     Optional[str]  = None
    timezone:                    str = "Asia/Karachi"
    currency:                    str = "PKR"
    language:                    str = "en"
    country_code:                str = "PK"
    barcode_format:              Optional[str]  = None
    barcode_prefix:              Optional[str]  = None
    barcode_auto_generate:       bool = True
    allow_negative_stock:        bool = False
    require_batch_on_sale:       bool = True
    auto_calc_expiry_warning_days: int = 90
    low_stock_threshold:         int = 10
    receipt_header:              Optional[str]  = None
    receipt_footer:              Optional[str]  = None
    show_logo_on_receipt:        bool = True
    show_barcode_on_receipt:     bool = False
    is_fully_configured:         bool = False
    config_version:              int = 1
    notes:                       Optional[str]  = None


# ══════════════════════════════════════════════════════════════════════════════
#  2. BranchWorkingHours
# ══════════════════════════════════════════════════════════════════════════════

class WorkingHoursCreate(BaseModel):
    day_of_week:  str
    is_closed:    bool = False
    open_time:    Optional[str] = None
    close_time:   Optional[str] = None
    break_start:  Optional[str] = None
    break_end:    Optional[str] = None
    notes:        Optional[str] = None

    @field_validator("open_time", "close_time", "break_start", "break_end", mode="before")
    @classmethod
    def validate_time(cls, v: Any) -> Any:
        if v is None:
            return v
        try:
            h, m = str(v).split(":")
            assert 0 <= int(h) <= 23 and 0 <= int(m) <= 59
        except Exception:
            raise ValueError("Time must be in HH:MM format (e.g. 09:00)")
        return v


class WorkingHoursUpdate(BaseModel):
    is_closed:    Optional[bool] = None
    open_time:    Optional[str]  = None
    close_time:   Optional[str]  = None
    break_start:  Optional[str]  = None
    break_end:    Optional[str]  = None
    notes:        Optional[str]  = None


class WorkingHoursRead(ConfigRead):
    branch_id:    str
    day_of_week:  str
    is_closed:    bool
    open_time:    Optional[str] = None
    close_time:   Optional[str] = None
    break_start:  Optional[str] = None
    break_end:    Optional[str] = None
    notes:        Optional[str] = None


# ══════════════════════════════════════════════════════════════════════════════
#  3. BranchHoliday
# ══════════════════════════════════════════════════════════════════════════════

class HolidayCreate(BaseModel):
    name:          str
    holiday_date:  date
    holiday_type:  str = "public"
    is_recurring:  bool = False
    description:   Optional[str] = None
    is_active:     bool = True


class HolidayUpdate(BaseModel):
    name:          Optional[str]  = None
    holiday_date:  Optional[date] = None
    holiday_type:  Optional[str]  = None
    is_recurring:  Optional[bool] = None
    description:   Optional[str]  = None
    is_active:     Optional[bool] = None


class HolidayRead(ConfigRead):
    branch_id:     str
    name:          str
    holiday_date:  date
    holiday_type:  str
    is_recurring:  bool
    description:   Optional[str] = None
    is_active:     bool


# ══════════════════════════════════════════════════════════════════════════════
#  4. BranchWarehouse
# ══════════════════════════════════════════════════════════════════════════════

class WarehouseCreate(BaseModel):
    name:                  str
    code:                  str
    warehouse_type:        str = "main"
    is_default:            bool = False
    is_active:             bool = True
    capacity_units:        Optional[int]   = None
    location_description:  Optional[str]   = None
    temperature_min:       Optional[float] = None
    temperature_max:       Optional[float] = None
    notes:                 Optional[str]   = None


class WarehouseUpdate(BaseModel):
    name:                  Optional[str]   = None
    code:                  Optional[str]   = None
    warehouse_type:        Optional[str]   = None
    is_default:            Optional[bool]  = None
    is_active:             Optional[bool]  = None
    capacity_units:        Optional[int]   = None
    current_units:         Optional[int]   = None
    location_description:  Optional[str]   = None
    temperature_min:       Optional[float] = None
    temperature_max:       Optional[float] = None
    notes:                 Optional[str]   = None


class WarehouseRead(ConfigRead):
    branch_id:             str
    name:                  str
    code:                  str
    warehouse_type:        str
    is_default:            bool
    is_active:             bool
    capacity_units:        Optional[int]   = None
    current_units:         Optional[int]   = None
    location_description:  Optional[str]   = None
    temperature_min:       Optional[float] = None
    temperature_max:       Optional[float] = None
    notes:                 Optional[str]   = None
    utilization_percent:   Optional[float] = None   # computed


# ══════════════════════════════════════════════════════════════════════════════
#  5. BranchCounter
# ══════════════════════════════════════════════════════════════════════════════

class CounterCreate(BaseModel):
    name:                  str
    code:                  str
    ip_address:            Optional[str] = None
    mac_address:           Optional[str] = None
    default_printer_id:    Optional[str] = None
    default_warehouse_id:  Optional[str] = None
    is_active:             bool = True
    notes:                 Optional[str] = None


class CounterUpdate(BaseModel):
    name:                  Optional[str]  = None
    code:                  Optional[str]  = None
    ip_address:            Optional[str]  = None
    mac_address:           Optional[str]  = None
    default_printer_id:    Optional[str]  = None
    default_warehouse_id:  Optional[str]  = None
    is_active:             Optional[bool] = None
    notes:                 Optional[str]  = None


class CounterRead(ConfigRead):
    branch_id:             str
    name:                  str
    code:                  str
    ip_address:            Optional[str]  = None
    mac_address:           Optional[str]  = None
    default_printer_id:    Optional[str]  = None
    default_warehouse_id:  Optional[str]  = None
    is_active:             bool
    notes:                 Optional[str]  = None


# ══════════════════════════════════════════════════════════════════════════════
#  6. BranchPrinter
# ══════════════════════════════════════════════════════════════════════════════

class PrinterCreate(BaseModel):
    name:              str
    printer_type:      str = "thermal"
    connection_type:   str = "network"
    ip_address:        Optional[str] = None
    port:              Optional[int] = 9100
    usb_path:          Optional[str] = None
    is_default:        bool = False
    is_active:         bool = True
    paper_size:        Optional[str] = "80mm"
    copies:            int = 1
    notes:             Optional[str] = None


class PrinterUpdate(BaseModel):
    name:              Optional[str]  = None
    printer_type:      Optional[str]  = None
    connection_type:   Optional[str]  = None
    ip_address:        Optional[str]  = None
    port:              Optional[int]  = None
    usb_path:          Optional[str]  = None
    is_default:        Optional[bool] = None
    is_active:         Optional[bool] = None
    paper_size:        Optional[str]  = None
    copies:            Optional[int]  = None
    notes:             Optional[str]  = None


class PrinterRead(ConfigRead):
    branch_id:         str
    name:              str
    printer_type:      str
    connection_type:   Optional[str]  = None
    ip_address:        Optional[str]  = None
    port:              Optional[int]  = None
    usb_path:          Optional[str]  = None
    is_default:        bool
    is_active:         bool
    paper_size:        Optional[str]  = None
    copies:            int
    notes:             Optional[str]  = None


# ══════════════════════════════════════════════════════════════════════════════
#  7. BranchDevice
# ══════════════════════════════════════════════════════════════════════════════

class DeviceCreate(BaseModel):
    device_name:       str
    device_type:       str = "desktop"
    mac_address:       Optional[str] = None
    ip_address:        Optional[str] = None
    os:                Optional[str] = None
    browser:           Optional[str] = None
    serial_number:     Optional[str] = None
    is_registered:     bool = False
    is_active:         bool = True
    is_trusted:        bool = False
    notes:             Optional[str] = None


class DeviceUpdate(BaseModel):
    device_name:       Optional[str]  = None
    device_type:       Optional[str]  = None
    ip_address:        Optional[str]  = None
    os:                Optional[str]  = None
    is_registered:     Optional[bool] = None
    is_active:         Optional[bool] = None
    is_trusted:        Optional[bool] = None
    notes:             Optional[str]  = None


class DeviceRead(ConfigRead):
    branch_id:         str
    device_name:       str
    device_type:       str
    mac_address:       Optional[str]  = None
    ip_address:        Optional[str]  = None
    os:                Optional[str]  = None
    browser:           Optional[str]  = None
    serial_number:     Optional[str]  = None
    registered_by_id:  Optional[str]  = None
    is_registered:     bool
    is_active:         bool
    is_trusted:        bool
    last_seen_at:      Optional[datetime] = None
    notes:             Optional[str]  = None


# ══════════════════════════════════════════════════════════════════════════════
#  8. BranchDocumentSeries
# ══════════════════════════════════════════════════════════════════════════════

class DocumentSeriesCreate(BaseModel):
    document_type:     str
    prefix:            Optional[str] = None
    suffix:            Optional[str] = None
    next_number:       int = 1
    padding:           int = 5
    reset_policy:      str = "never"
    format_template:   Optional[str] = None
    is_active:         bool = True
    notes:             Optional[str] = None


class DocumentSeriesUpdate(BaseModel):
    prefix:            Optional[str]  = None
    suffix:            Optional[str]  = None
    next_number:       Optional[int]  = None
    padding:           Optional[int]  = None
    reset_policy:      Optional[str]  = None
    format_template:   Optional[str]  = None
    is_active:         Optional[bool] = None
    notes:             Optional[str]  = None


class DocumentSeriesRead(ConfigRead):
    branch_id:         str
    document_type:     str
    prefix:            Optional[str]  = None
    suffix:            Optional[str]  = None
    next_number:       int
    padding:           int
    reset_policy:      str
    format_template:   Optional[str]  = None
    last_reset_at:     Optional[datetime] = None
    is_active:         bool
    notes:             Optional[str]  = None
    preview_number:    Optional[str]  = None   # computed: what the next number will look like


# ══════════════════════════════════════════════════════════════════════════════
#  9. BranchTaxSetting
# ══════════════════════════════════════════════════════════════════════════════

class TaxSettingCreate(BaseModel):
    tax_name:          str
    tax_type:          str = "gst"
    rate:              float = 0.0
    is_default:        bool = False
    is_compound:       bool = False
    is_inclusive:      bool = False
    applies_to:        Optional[List[str]] = None
    tax_account_code:  Optional[str] = None
    is_active:         bool = True
    notes:             Optional[str] = None


class TaxSettingUpdate(BaseModel):
    tax_name:          Optional[str]       = None
    tax_type:          Optional[str]       = None
    rate:              Optional[float]     = None
    is_default:        Optional[bool]      = None
    is_compound:       Optional[bool]      = None
    is_inclusive:      Optional[bool]      = None
    applies_to:        Optional[List[str]] = None
    tax_account_code:  Optional[str]       = None
    is_active:         Optional[bool]      = None
    notes:             Optional[str]       = None


class TaxSettingRead(ConfigRead):
    branch_id:         str
    tax_name:          str
    tax_type:          str
    rate:              float
    is_default:        bool
    is_compound:       bool
    is_inclusive:      bool
    applies_to:        Optional[List[str]] = None
    tax_account_code:  Optional[str]       = None
    is_active:         bool
    notes:             Optional[str]       = None


# ══════════════════════════════════════════════════════════════════════════════
#  10. BranchPreference
# ══════════════════════════════════════════════════════════════════════════════

class PreferenceUpsert(BaseModel):
    pref_key:          str
    pref_value:        Optional[str] = None
    data_type:         str = "string"
    category:          Optional[str] = None
    description:       Optional[str] = None


class PreferenceBulkSet(BaseModel):
    preferences:       List[PreferenceUpsert]


class PreferenceRead(ConfigRead):
    branch_id:         str
    pref_key:          str
    pref_value:        Optional[str] = None
    data_type:         str
    category:          Optional[str] = None
    description:       Optional[str] = None
    is_system:         bool


# ══════════════════════════════════════════════════════════════════════════════
#  11. BranchLicense
# ══════════════════════════════════════════════════════════════════════════════

class LicenseCreate(BaseModel):
    license_name:          str
    license_number:        Optional[str]  = None
    license_type:          str
    issuing_authority:     Optional[str]  = None
    issue_date:            Optional[date] = None
    expiry_date:           Optional[date] = None
    renewal_reminder_days: int = 30
    status:                str = "active"
    attachment_url:        Optional[str]  = None
    notes:                 Optional[str]  = None


class LicenseUpdate(BaseModel):
    license_name:          Optional[str]  = None
    license_number:        Optional[str]  = None
    license_type:          Optional[str]  = None
    issuing_authority:     Optional[str]  = None
    issue_date:            Optional[date] = None
    expiry_date:           Optional[date] = None
    renewal_reminder_days: Optional[int]  = None
    status:                Optional[str]  = None
    attachment_url:        Optional[str]  = None
    notes:                 Optional[str]  = None


class LicenseRead(ConfigRead):
    branch_id:             str
    license_name:          str
    license_number:        Optional[str]  = None
    license_type:          str
    issuing_authority:     Optional[str]  = None
    issue_date:            Optional[date] = None
    expiry_date:           Optional[date] = None
    renewal_reminder_days: int
    status:                str
    attachment_url:        Optional[str]  = None
    notes:                 Optional[str]  = None
    days_until_expiry:     Optional[int]  = None   # computed
    is_expiring_soon:      bool = False             # computed


# ══════════════════════════════════════════════════════════════════════════════
#  12. BranchFinancialAccount
# ══════════════════════════════════════════════════════════════════════════════

class FinancialAccountCreate(BaseModel):
    account_name:          str
    account_type:          str = "cash"
    bank_name:             Optional[str]   = None
    account_number:        Optional[str]   = None
    iban:                  Optional[str]   = None
    branch_name:           Optional[str]   = None
    opening_balance:       float = 0.0
    is_default:            bool = False
    is_active:             bool = True
    ledger_account_code:   Optional[str]   = None
    notes:                 Optional[str]   = None


class FinancialAccountUpdate(BaseModel):
    account_name:          Optional[str]   = None
    account_type:          Optional[str]   = None
    bank_name:             Optional[str]   = None
    account_number:        Optional[str]   = None
    iban:                  Optional[str]   = None
    branch_name:           Optional[str]   = None
    opening_balance:       Optional[float] = None
    is_default:            Optional[bool]  = None
    is_active:             Optional[bool]  = None
    ledger_account_code:   Optional[str]   = None
    notes:                 Optional[str]   = None


class FinancialAccountRead(ConfigRead):
    branch_id:             str
    account_name:          str
    account_type:          str
    bank_name:             Optional[str]   = None
    account_number:        Optional[str]   = None
    iban:                  Optional[str]   = None
    branch_name:           Optional[str]   = None
    opening_balance:       float
    is_default:            bool
    is_active:             bool
    ledger_account_code:   Optional[str]   = None
    notes:                 Optional[str]   = None


# ══════════════════════════════════════════════════════════════════════════════
#  13. BranchPaymentMethod
# ══════════════════════════════════════════════════════════════════════════════

class PaymentMethodCreate(BaseModel):
    method_type:           str
    display_name:          Optional[str]  = None
    is_enabled:            bool = True
    is_default:            bool = False
    requires_reference:    bool = False
    account_id:            Optional[str]  = None
    sort_order:            int = 0
    notes:                 Optional[str]  = None


class PaymentMethodUpdate(BaseModel):
    display_name:          Optional[str]  = None
    is_enabled:            Optional[bool] = None
    is_default:            Optional[bool] = None
    requires_reference:    Optional[bool] = None
    account_id:            Optional[str]  = None
    sort_order:            Optional[int]  = None
    notes:                 Optional[str]  = None


class PaymentMethodRead(ConfigRead):
    branch_id:             str
    method_type:           str
    display_name:          Optional[str]  = None
    is_enabled:            bool
    is_default:            bool
    requires_reference:    bool
    account_id:            Optional[str]  = None
    sort_order:            int
    notes:                 Optional[str]  = None


# ══════════════════════════════════════════════════════════════════════════════
#  14. BranchNotificationSetting
# ══════════════════════════════════════════════════════════════════════════════

class NotificationSettingUpdate(BaseModel):
    is_enabled:            Optional[bool]       = None
    channel_email:         Optional[bool]       = None
    channel_sms:           Optional[bool]       = None
    channel_whatsapp:      Optional[bool]       = None
    channel_in_app:        Optional[bool]       = None
    recipient_roles:       Optional[List[str]]  = None
    threshold_value:       Optional[float]      = None
    cool_down_minutes:     Optional[int]        = None
    notes:                 Optional[str]        = None


class NotificationSettingRead(ConfigRead):
    branch_id:             str
    event_type:            str
    is_enabled:            bool
    channel_email:         bool
    channel_sms:           bool
    channel_whatsapp:      bool
    channel_in_app:        bool
    recipient_roles:       Optional[List[str]]  = None
    threshold_value:       Optional[float]      = None
    cool_down_minutes:     int
    notes:                 Optional[str]        = None


class NotificationSettingsBulkRead(BaseModel):
    settings: List[NotificationSettingRead]
    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
#  15. BranchBranding
# ══════════════════════════════════════════════════════════════════════════════

class BrandingUpdate(BaseModel):
    logo_url:              Optional[str]  = None
    invoice_logo_url:      Optional[str]  = None
    receipt_logo_url:      Optional[str]  = None
    watermark_url:         Optional[str]  = None
    signature_url:         Optional[str]  = None
    stamp_url:             Optional[str]  = None
    theme_color:           Optional[str]  = None
    accent_color:          Optional[str]  = None
    font_family:           Optional[str]  = None
    show_watermark:        Optional[bool] = None
    show_stamp:            Optional[bool] = None
    show_signature:        Optional[bool] = None


class BrandingRead(ConfigRead):
    branch_id:             str
    logo_url:              Optional[str]  = None
    invoice_logo_url:      Optional[str]  = None
    receipt_logo_url:      Optional[str]  = None
    watermark_url:         Optional[str]  = None
    signature_url:         Optional[str]  = None
    stamp_url:             Optional[str]  = None
    theme_color:           Optional[str]  = None
    accent_color:          Optional[str]  = None
    font_family:           Optional[str]  = None
    show_watermark:        bool = False
    show_stamp:            bool = False
    show_signature:        bool = False


# ══════════════════════════════════════════════════════════════════════════════
#  16. BranchPosConfig
# ══════════════════════════════════════════════════════════════════════════════

class PosConfigUpdate(BaseModel):
    receipt_printer_id:       Optional[str]   = None
    label_printer_id:         Optional[str]   = None
    barcode_scanner_enabled:  Optional[bool]  = None
    cash_drawer_enabled:      Optional[bool]  = None
    cash_drawer_port:         Optional[str]   = None
    customer_display_enabled: Optional[bool]  = None
    weighing_scale_enabled:   Optional[bool]  = None
    weighing_scale_port:      Optional[str]   = None
    default_warehouse_id:     Optional[str]   = None
    default_counter_id:       Optional[str]   = None
    auto_print_receipt:       Optional[bool]  = None
    auto_open_cash_drawer:    Optional[bool]  = None
    require_customer_on_sale: Optional[bool]  = None
    allow_hold_sale:          Optional[bool]  = None
    max_hold_sales:           Optional[int]   = None
    discount_limit_percent:   Optional[float] = None
    round_total:              Optional[bool]  = None
    round_to:                 Optional[float] = None


class PosConfigRead(ConfigRead):
    branch_id:                str
    receipt_printer_id:       Optional[str]   = None
    label_printer_id:         Optional[str]   = None
    barcode_scanner_enabled:  bool = True
    cash_drawer_enabled:      bool = False
    cash_drawer_port:         Optional[str]   = None
    customer_display_enabled: bool = False
    weighing_scale_enabled:   bool = False
    weighing_scale_port:      Optional[str]   = None
    default_warehouse_id:     Optional[str]   = None
    default_counter_id:       Optional[str]   = None
    auto_print_receipt:       bool = True
    auto_open_cash_drawer:    bool = False
    require_customer_on_sale: bool = False
    allow_hold_sale:          bool = True
    max_hold_sales:           int = 5
    discount_limit_percent:   float = 10.0
    round_total:              bool = True
    round_to:                 float = 1.0


# ══════════════════════════════════════════════════════════════════════════════
#  17. BranchSecuritySetting
# ══════════════════════════════════════════════════════════════════════════════

class SecuritySettingUpdate(BaseModel):
    ip_whitelist_enabled:         Optional[bool]       = None
    ip_whitelist:                 Optional[List[str]]  = None
    gps_restriction_enabled:      Optional[bool]       = None
    gps_radius_meters:            Optional[int]        = None
    allowed_locations:            Optional[List[Dict[str, Any]]] = None
    session_timeout_minutes:      Optional[int]        = None
    max_concurrent_sessions:      Optional[int]        = None
    require_2fa:                  Optional[bool]       = None
    require_device_registration:  Optional[bool]       = None
    login_time_enabled:           Optional[bool]       = None
    login_allowed_from:           Optional[str]        = None
    login_allowed_until:          Optional[str]        = None
    login_allowed_days:           Optional[List[str]]  = None
    password_expiry_days:         Optional[int]        = None
    failed_login_lockout:         Optional[int]        = None
    lockout_duration_minutes:     Optional[int]        = None


class SecuritySettingRead(ConfigRead):
    branch_id:                    str
    ip_whitelist_enabled:         bool = False
    ip_whitelist:                 Optional[List[str]]  = None
    gps_restriction_enabled:      bool = False
    gps_radius_meters:            Optional[int]        = None
    allowed_locations:            Optional[List[Dict[str, Any]]] = None
    session_timeout_minutes:      int = 480
    max_concurrent_sessions:      int = 5
    require_2fa:                  bool = False
    require_device_registration:  bool = False
    login_time_enabled:           bool = False
    login_allowed_from:           Optional[str]        = None
    login_allowed_until:          Optional[str]        = None
    login_allowed_days:           Optional[List[str]]  = None
    password_expiry_days:         int = 90
    failed_login_lockout:         int = 5
    lockout_duration_minutes:     int = 30


# ══════════════════════════════════════════════════════════════════════════════
#  18. BranchBackupSetting
# ══════════════════════════════════════════════════════════════════════════════

class BackupSettingUpdate(BaseModel):
    auto_backup_enabled:   Optional[bool]  = None
    backup_schedule:       Optional[str]   = None
    backup_time:           Optional[str]   = None
    retention_days:        Optional[int]   = None
    local_backup_enabled:  Optional[bool]  = None
    local_backup_path:     Optional[str]   = None
    cloud_backup_enabled:  Optional[bool]  = None
    cloud_provider:        Optional[str]   = None
    cloud_bucket:          Optional[str]   = None
    compress_backup:       Optional[bool]  = None
    encrypt_backup:        Optional[bool]  = None


class BackupSettingRead(ConfigRead):
    branch_id:             str
    auto_backup_enabled:   bool = True
    backup_schedule:       Optional[str]   = None
    backup_time:           Optional[str]   = None
    retention_days:        int = 30
    local_backup_enabled:  bool = True
    local_backup_path:     Optional[str]   = None
    cloud_backup_enabled:  bool = False
    cloud_provider:        Optional[str]   = None
    cloud_bucket:          Optional[str]   = None
    compress_backup:       bool = True
    encrypt_backup:        bool = False
    last_backup_at:        Optional[datetime] = None
    last_backup_status:    Optional[str]   = None
    last_backup_size_mb:   Optional[float] = None


# ══════════════════════════════════════════════════════════════════════════════
#  19. BranchConfigAuditLog
# ══════════════════════════════════════════════════════════════════════════════

class ConfigAuditLogRead(ConfigRead):
    branch_id:             str
    module:                str
    action:                str
    record_id:             Optional[str]  = None
    field_name:            Optional[str]  = None
    old_value:             Optional[str]  = None
    new_value:             Optional[str]  = None
    performed_by_id:       Optional[str]  = None
    ip_address:            Optional[str]  = None
    device_name:           Optional[str]  = None
    summary:               Optional[str]  = None


class ConfigAuditLogList(BaseModel):
    items: List[ConfigAuditLogRead]
    total: int
    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
#  20. BranchHealthSnapshot / Dashboard
# ══════════════════════════════════════════════════════════════════════════════

class BranchHealthRead(BaseModel):
    branch_id:                str
    active_users:             int = 0
    active_devices:           int = 0
    connected_printers:       int = 0
    active_warehouses:        int = 0
    active_counters:          int = 0
    last_backup_at:           Optional[datetime] = None
    last_backup_status:       Optional[str]      = None
    storage_used_mb:          float = 0.0
    licenses_expiring_soon:   int = 0
    licenses_expired:         int = 0
    config_health_score:      float = 0.0
    missing_configs:          Optional[List[str]] = None

    model_config = {"from_attributes": True}


# ══════════════════════════════════════════════════════════════════════════════
#  Aggregate — full branch settings overview
# ══════════════════════════════════════════════════════════════════════════════

class BranchSettingsOverview(BaseModel):
    """Single response containing all branch settings for the settings page."""
    configuration:          Optional[BranchConfigurationRead]    = None
    working_hours:          List[WorkingHoursRead]                = []
    holidays:               List[HolidayRead]                    = []
    warehouses:             List[WarehouseRead]                   = []
    counters:               List[CounterRead]                     = []
    printers:               List[PrinterRead]                     = []
    devices:                List[DeviceRead]                      = []
    document_series:        List[DocumentSeriesRead]              = []
    tax_settings:           List[TaxSettingRead]                  = []
    preferences:            List[PreferenceRead]                  = []
    licenses:               List[LicenseRead]                     = []
    financial_accounts:     List[FinancialAccountRead]            = []
    payment_methods:        List[PaymentMethodRead]               = []
    notification_settings:  List[NotificationSettingRead]         = []
    branding:               Optional[BrandingRead]                = None
    pos_config:             Optional[PosConfigRead]               = None
    security_setting:       Optional[SecuritySettingRead]         = None
    backup_setting:         Optional[BackupSettingRead]           = None
    health:                 Optional[BranchHealthRead]            = None

    model_config = {"from_attributes": True}
