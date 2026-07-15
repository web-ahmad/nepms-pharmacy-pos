// features/branches/types/branch.ts
// TypeScript interfaces for the Enterprise Branch Management module.

export type BranchType =
  | 'head_office'
  | 'main_branch'
  | 'retail_branch'
  | 'warehouse'
  | 'distribution_center'
  | 'franchise_branch'
  | 'online_branch'
  | 'temporary_branch';

export type BranchStatus =
  | 'active'
  | 'inactive'
  | 'under_construction'
  | 'suspended'
  | 'closed'
  | 'maintenance';

export type StaffRole = 'manager' | 'pharmacist' | 'cashier' | 'supervisor' | 'staff';

// ── Labels ────────────────────────────────────────────────────────────────────

export const BRANCH_TYPE_LABELS: Record<BranchType, string> = {
  head_office:         'Head Office',
  main_branch:         'Main Branch',
  retail_branch:       'Retail Branch',
  warehouse:           'Warehouse',
  distribution_center: 'Distribution Center',
  franchise_branch:    'Franchise Branch',
  online_branch:       'Online Branch',
  temporary_branch:    'Temporary Branch',
};

export const BRANCH_STATUS_LABELS: Record<BranchStatus, string> = {
  active:             'Active',
  inactive:           'Inactive',
  under_construction: 'Under Construction',
  suspended:          'Suspended',
  closed:             'Closed',
  maintenance:        'Maintenance',
};

export const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  manager:    'Branch Manager',
  pharmacist: 'Pharmacist In Charge',
  cashier:    'Cashier',
  supervisor: 'Supervisor',
  staff:      'Staff',
};

// ── Nested settings ───────────────────────────────────────────────────────────

export interface DaySchedule {
  open: string;       // "HH:MM"
  close: string;
  is_closed: boolean;
}

export interface WorkingHours {
  monday:    DaySchedule;
  tuesday:   DaySchedule;
  wednesday: DaySchedule;
  thursday:  DaySchedule;
  friday:    DaySchedule;
  saturday:  DaySchedule;
  sunday:    DaySchedule;
}

export interface EmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface TaxSettings {
  gst_rate?: number;
  pst_rate?: number;
  withholding_rate?: number;
}

export interface GpsVerification {
  enabled: boolean;
  radius_meters: number;
}

export interface SecuritySettings {
  ip_whitelist?: string[];
  device_restrictions?: string[];
  gps_verification?: GpsVerification;
  allowed_locations?: Array<{ lat: number; lng: number; name: string }>;
  access_policies?: Record<string, unknown>;
}

// ── Core entities ─────────────────────────────────────────────────────────────

export interface BranchStaffInfo {
  id: string;
  username: string;
  full_name?: string;
  email?: string;
  is_active: boolean;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  type: BranchType;
  status: BranchStatus;
  logo?: string;
  email?: string;
  phone?: string;
  alternate_phone?: string;
  country?: string;
  province?: string;
  region?: string;
  city?: string;
  address?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  manager_name?: string;
  manager_email?: string;
  manager_phone?: string;
  manager_user_id?: string;
  pharmacist_user_id?: string;
  drug_license_number?: string;
  drug_license_expiry?: string;
  tax_number?: string;
  opening_date?: string;
  timezone?: string;
  currency?: string;
  notes?: string;
  theme_color?: string;
  invoice_prefix?: string;
  receipt_footer?: string;
  sort_order?: number;
  working_hours?: WorkingHours;
  weekly_holidays?: string[];
  emergency_contact?: EmergencyContact;
  tax_settings?: TaxSettings;
  security_settings?: SecuritySettings;
  health_score?: number;
  pharmacy_id?: string;
  staff_count?: number;
  manager_info?: BranchStaffInfo;
  created_at?: string;
  updated_at?: string;
}

export type BranchCreate = Omit<Branch, 'id' | 'created_at' | 'updated_at' | 'pharmacy_id' | 'staff_count' | 'manager_info'>;

export type BranchUpdate = Partial<BranchCreate>;

// ── List / pagination ─────────────────────────────────────────────────────────

export interface BranchListResponse {
  items: Branch[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface BranchListParams {
  search?: string;
  status?: BranchStatus;
  type?: BranchType;
  region?: string;
  city?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ── Staff assignment ──────────────────────────────────────────────────────────

export interface BranchStaffAssignment {
  id: string;
  branch_id: string;
  user_id: string;
  role: StaffRole;
  is_active: boolean;
  assigned_at?: string;
  notes?: string;
  user?: BranchStaffInfo;
}

export interface BranchStaffAssignmentCreate {
  user_id: string;
  role: StaffRole;
  notes?: string;
}

// ── Performance metrics ───────────────────────────────────────────────────────

export interface BranchStats {
  branch_id: string;
  branch_name: string;
  total_sales: number;
  monthly_sales: number;
  daily_sales: number;
  total_profit: number;
  monthly_profit: number;
  total_customers: number;
  total_prescriptions: number;
  inventory_value: number;
  low_stock_count: number;
  expiry_count: number;
  staff_count: number;
  active_staff: number;
  health_score: number;
  license_days_remaining?: number;
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

export interface BranchDashboardSummary {
  total_branches: number;
  active_branches: number;
  by_status: Record<BranchStatus, number>;
  by_type: Record<BranchType, number>;
}

// ── Comparison ────────────────────────────────────────────────────────────────

export interface BranchComparisonRequest {
  branch_ids: string[];
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

export interface BranchComparisonResponse {
  branches: BranchStats[];
  period: string;
  generated_at: string;
}

// ── View mode ─────────────────────────────────────────────────────────────────

export type BranchViewMode = 'table' | 'card';
