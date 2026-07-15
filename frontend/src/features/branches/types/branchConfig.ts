export interface ConfigRead {
  id: string;
  created_at: string;
  updated_at?: string;
}

export interface BranchConfiguration extends ConfigRead {
  branch_id: string;
  display_name?: string;
  tagline?: string;
  timezone: string;
  currency: string;
  language: string;
  country_code: string;
  barcode_format?: string;
  barcode_prefix?: string;
  barcode_auto_generate: boolean;
  allow_negative_stock: boolean;
  require_batch_on_sale: boolean;
  auto_calc_expiry_warning_days: number;
  low_stock_threshold: number;
  receipt_header?: string;
  receipt_footer?: string;
  show_logo_on_receipt: boolean;
  show_barcode_on_receipt: boolean;
  is_fully_configured: boolean;
  config_version: number;
  notes?: string;
}

export interface BranchWorkingHours extends ConfigRead {
  branch_id: string;
  day_of_week: string;
  is_closed: boolean;
  open_time?: string;
  close_time?: string;
  break_start?: string;
  break_end?: string;
  notes?: string;
}

export interface BranchHoliday extends ConfigRead {
  branch_id: string;
  name: string;
  holiday_date: string;
  holiday_type: string;
  is_recurring: boolean;
  description?: string;
  is_active: boolean;
}

export interface BranchWarehouse extends ConfigRead {
  branch_id: string;
  name: string;
  code: string;
  warehouse_type: string;
  is_default: boolean;
  is_active: boolean;
  capacity_units?: number;
  current_units?: number;
  location_description?: string;
  temperature_min?: number;
  temperature_max?: number;
  notes?: string;
  utilization_percent?: number;
}

export interface BranchCounter extends ConfigRead {
  branch_id: string;
  name: string;
  code: string;
  ip_address?: string;
  mac_address?: string;
  default_printer_id?: string;
  default_warehouse_id?: string;
  is_active: boolean;
  notes?: string;
}

export interface BranchPrinter extends ConfigRead {
  branch_id: string;
  name: string;
  printer_type: string;
  connection_type?: string;
  ip_address?: string;
  port?: number;
  usb_path?: string;
  is_default: boolean;
  is_active: boolean;
  paper_size?: string;
  copies: number;
  notes?: string;
}

export interface BranchDevice extends ConfigRead {
  branch_id: string;
  device_name: string;
  device_type: string;
  mac_address?: string;
  ip_address?: string;
  os?: string;
  browser?: string;
  serial_number?: string;
  registered_by_id?: string;
  is_registered: boolean;
  is_active: boolean;
  is_trusted: boolean;
  last_seen_at?: string;
  notes?: string;
}

export interface BranchDocumentSeries extends ConfigRead {
  branch_id: string;
  document_type: string;
  prefix?: string;
  suffix?: string;
  next_number: number;
  padding: number;
  reset_policy: string;
  format_template?: string;
  last_reset_at?: string;
  is_active: boolean;
  notes?: string;
  preview_number?: string;
}

export interface BranchTaxSetting extends ConfigRead {
  branch_id: string;
  tax_name: string;
  tax_type: string;
  rate: number;
  is_default: boolean;
  is_compound: boolean;
  is_inclusive: boolean;
  applies_to?: string[];
  tax_account_code?: string;
  is_active: boolean;
  notes?: string;
}

export interface BranchPreference extends ConfigRead {
  branch_id: string;
  pref_key: string;
  pref_value?: string;
  data_type: 'string' | 'int' | 'float' | 'bool' | 'json';
  category?: string;
  description?: string;
  is_system: boolean;
}

export interface BranchLicense extends ConfigRead {
  branch_id: string;
  license_name: string;
  license_number?: string;
  license_type: string;
  issuing_authority?: string;
  issue_date?: string;
  expiry_date?: string;
  renewal_reminder_days: number;
  status: string;
  attachment_url?: string;
  notes?: string;
  days_until_expiry?: number;
  is_expiring_soon: boolean;
}

export interface BranchFinancialAccount extends ConfigRead {
  branch_id: string;
  account_name: string;
  account_type: string;
  bank_name?: string;
  account_number?: string;
  iban?: string;
  branch_name?: string;
  opening_balance: number;
  is_default: boolean;
  is_active: boolean;
  ledger_account_code?: string;
  notes?: string;
}

export interface BranchPaymentMethod extends ConfigRead {
  branch_id: string;
  method_type: string;
  display_name?: string;
  is_enabled: boolean;
  is_default: boolean;
  requires_reference: boolean;
  account_id?: string;
  sort_order: number;
  notes?: string;
}

export interface BranchNotificationSetting extends ConfigRead {
  branch_id: string;
  event_type: string;
  is_enabled: boolean;
  channel_email: boolean;
  channel_sms: boolean;
  channel_whatsapp: boolean;
  channel_in_app: boolean;
  recipient_roles?: string[];
  threshold_value?: number;
  cool_down_minutes: number;
  notes?: string;
}

export interface BranchBranding extends ConfigRead {
  branch_id: string;
  logo_url?: string;
  invoice_logo_url?: string;
  receipt_logo_url?: string;
  watermark_url?: string;
  signature_url?: string;
  stamp_url?: string;
  theme_color?: string;
  accent_color?: string;
  font_family?: string;
  show_watermark: boolean;
  show_stamp: boolean;
  show_signature: boolean;
}

export interface BranchPosConfig extends ConfigRead {
  branch_id: string;
  receipt_printer_id?: string;
  label_printer_id?: string;
  barcode_scanner_enabled: boolean;
  cash_drawer_enabled: boolean;
  cash_drawer_port?: string;
  customer_display_enabled: boolean;
  weighing_scale_enabled: boolean;
  weighing_scale_port?: string;
  default_warehouse_id?: string;
  default_counter_id?: string;
  auto_print_receipt: boolean;
  auto_open_cash_drawer: boolean;
  require_customer_on_sale: boolean;
  allow_hold_sale: boolean;
  max_hold_sales: number;
  discount_limit_percent: number;
  round_total: boolean;
  round_to: number;
}

export interface BranchSecuritySetting extends ConfigRead {
  branch_id: string;
  ip_whitelist_enabled: boolean;
  ip_whitelist?: string[];
  gps_restriction_enabled: boolean;
  gps_radius_meters?: number;
  allowed_locations?: any[];
  session_timeout_minutes: number;
  max_concurrent_sessions: number;
  require_2fa: boolean;
  require_device_registration: boolean;
  login_time_enabled: boolean;
  login_allowed_from?: string;
  login_allowed_until?: string;
  login_allowed_days?: string[];
  password_expiry_days: number;
  failed_login_lockout: number;
  lockout_duration_minutes: number;
}

export interface BranchBackupSetting extends ConfigRead {
  branch_id: string;
  auto_backup_enabled: boolean;
  backup_schedule?: string;
  backup_time?: string;
  retention_days: number;
  local_backup_enabled: boolean;
  local_backup_path?: string;
  cloud_backup_enabled: boolean;
  cloud_provider?: string;
  cloud_bucket?: string;
  compress_backup: boolean;
  encrypt_backup: boolean;
  last_backup_at?: string;
  last_backup_status?: string;
  last_backup_size_mb?: number;
}

export interface BranchConfigAuditLog extends ConfigRead {
  branch_id: string;
  module: string;
  action: string;
  record_id?: string;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  performed_by_id?: string;
  ip_address?: string;
  device_name?: string;
  summary?: string;
}

export interface BranchHealth {
  branch_id: string;
  active_users: number;
  active_devices: number;
  connected_printers: number;
  active_warehouses: number;
  active_counters: number;
  last_backup_at?: string;
  last_backup_status?: string;
  storage_used_mb: number;
  licenses_expiring_soon: number;
  licenses_expired: number;
  config_health_score: number;
  missing_configs?: string[];
}

export interface BranchSettingsOverview {
  configuration?: BranchConfiguration;
  working_hours: BranchWorkingHours[];
  holidays: BranchHoliday[];
  warehouses: BranchWarehouse[];
  counters: BranchCounter[];
  printers: BranchPrinter[];
  devices: BranchDevice[];
  document_series: BranchDocumentSeries[];
  tax_settings: BranchTaxSetting[];
  preferences: BranchPreference[];
  licenses: BranchLicense[];
  financial_accounts: BranchFinancialAccount[];
  payment_methods: BranchPaymentMethod[];
  notification_settings: BranchNotificationSetting[];
  branding?: BranchBranding;
  pos_config?: BranchPosConfig;
  security_setting?: BranchSecuritySetting;
  backup_setting?: BranchBackupSetting;
  health?: BranchHealth;
}
