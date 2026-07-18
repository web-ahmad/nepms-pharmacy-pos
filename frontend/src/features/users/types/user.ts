// features/users/types/user.ts
// TypeScript interfaces for Enterprise Users & Identity Management module.

// ── Enumerations ───────────────────────────────────────────────────────────────

export type EnterpriseUserStatus =
  | 'active'
  | 'inactive'
  | 'suspended'
  | 'locked_temp'
  | 'locked_permanent'
  | 'pending_approval'
  | 'force_change';

export type EnterpriseUserType =
  | 'pharmacy_owner'
  | 'super_admin'
  | 'branch_manager'
  | 'pharmacist'
  | 'assistant_pharmacist'
  | 'cashier'
  | 'store_keeper'
  | 'purchase_officer'
  | 'accountant'
  | 'hr'
  | 'delivery_staff'
  | 'auditor'
  | 'read_only'
  | 'custom';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';
export type ApprovalType =
  | 'new_user'
  | 'role_change'
  | 'branch_transfer'
  | 'permission_escalation'
  | 'unlock_account';

// ── Labels ─────────────────────────────────────────────────────────────────────

export const USER_STATUS_LABELS: Record<EnterpriseUserStatus, string> = {
  active:             'Active',
  inactive:           'Inactive',
  suspended:          'Suspended',
  locked_temp:        'Locked (Temp)',
  locked_permanent:   'Locked (Permanent)',
  pending_approval:   'Pending Approval',
  force_change:       'Force Password Change',
};

export const USER_TYPE_LABELS: Record<EnterpriseUserType, string> = {
  pharmacy_owner:       'Pharmacy Owner',
  super_admin:          'Super Admin',
  branch_manager:       'Branch Manager',
  pharmacist:           'Pharmacist',
  assistant_pharmacist: 'Assistant Pharmacist',
  cashier:              'Cashier',
  store_keeper:         'Store Keeper',
  purchase_officer:     'Purchase Officer',
  accountant:           'Accountant',
  hr:                   'HR',
  delivery_staff:       'Delivery Staff',
  auditor:              'Auditor',
  read_only:            'Read Only',
  custom:               'Custom',
};

export const USER_STATUS_COLORS: Record<EnterpriseUserStatus, string> = {
  active:             'text-emerald-600 bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800',
  inactive:           'text-zinc-500 bg-zinc-50 border-zinc-200 dark:bg-zinc-900/20 dark:border-zinc-800',
  suspended:          'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800',
  locked_temp:        'text-orange-600 bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800',
  locked_permanent:   'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
  pending_approval:   'text-blue-600 bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
  force_change:       'text-purple-600 bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800',
};

// ── Permission types ────────────────────────────────────────────────────────────

export interface Permission {
  id: string;
  module: string;
  action: string;
  code: string;
  label?: string;
  description?: string;
  is_sensitive: boolean;
}

export interface PermissionGrouped {
  module: string;
  permissions: Permission[];
}

// ── Role types ──────────────────────────────────────────────────────────────────

export interface RoleListItem {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_system_default: boolean;
  user_type?: string;
  branch_scope?: string;
  data_scope?: string;
  hierarchy_level?: number;
  sort_order?: number;
  permission_count: number;
  user_count: number;
  created_at: string;
}

export interface Role extends RoleListItem {
  is_branch_specific: boolean;
  max_users?: number;
  pharmacy_id?: string;
  permissions: Permission[];
  updated_at?: string;
}

export interface RoleCreate {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  is_system_default?: boolean;
  is_branch_specific?: boolean;
  user_type?: string;
  branch_scope?: string;
  data_scope?: string;
  max_users?: number;
  sort_order?: number;
  permission_ids?: string[];
}

export interface RoleUpdate extends Partial<RoleCreate> {}

export interface RoleListResponse {
  items: RoleListItem[];
  total: number;
}

// ── Branch assignment types ─────────────────────────────────────────────────────

export interface BranchInfo {
  id: string;
  name: string;
  code: string;
  city?: string;
  status: string;
}

export interface BranchAssignment {
  id: string;
  branch_id: string;
  branch?: BranchInfo;
  role: string;
  is_default_branch: boolean;
  is_temporary: boolean;
  access_expires_at?: string;
  assigned_at: string;
  is_active: boolean;
  notes?: string;
}

export interface BranchAssignmentCreate {
  branch_id: string;
  role?: string;
  is_default_branch?: boolean;
  is_temporary?: boolean;
  access_expires_at?: string;
  notes?: string;
  permission_overrides?: string[];
}

export interface BranchTransferRequest {
  from_branch_id: string;
  to_branch_id: string;
  role?: string;
  reason?: string;
}

// ── Session types ───────────────────────────────────────────────────────────────

export interface UserSession {
  id: string;
  device_name?: string;
  browser?: string;
  os?: string;
  ip_address?: string;
  location?: Record<string, unknown>;
  is_active: boolean;
  remember_me: boolean;
  last_activity_at?: string;
  expires_at?: string;
  created_at: string;
}

// ── Trusted device types ────────────────────────────────────────────────────────

export interface TrustedDevice {
  id: string;
  device_fingerprint: string;
  device_name?: string;
  browser?: string;
  os?: string;
  ip_address?: string;
  is_trusted: boolean;
  is_blocked: boolean;
  first_seen_at: string;
  last_seen_at: string;
}

// ── Login history types ─────────────────────────────────────────────────────────

export interface LoginHistoryEntry {
  id: string;
  event_type: string;
  ip_address?: string;
  device_name?: string;
  browser?: string;
  os?: string;
  location?: Record<string, unknown>;
  success: boolean;
  failure_reason?: string;
  created_at: string;
}

// ── Activity log types ──────────────────────────────────────────────────────────

export interface ActivityLogEntry {
  id: string;
  event_type: string;
  description?: string;
  event_metadata?: Record<string, unknown>;
  performed_by_id?: string;
  ip_address?: string;
  created_at: string;
}

// ── Approval types ──────────────────────────────────────────────────────────────

export interface ApprovalRequest {
  id: string;
  enterprise_user_id: string;
  approval_type: ApprovalType;
  status: ApprovalStatus;
  requested_by_id: string;
  reviewed_by_id?: string;
  requested_at: string;
  reviewed_at?: string;
  reason?: string;
  review_note?: string;
  payload?: Record<string, unknown>;
}

// ── Enterprise user types ───────────────────────────────────────────────────────

export interface EnterpriseUserListItem {
  id: string;
  user_id: string;
  user_type: EnterpriseUserType;
  status: EnterpriseUserStatus;
  username?: string;
  email?: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  employee_id?: string;
  enterprise_role?: RoleListItem;
  branch_count: number;
  last_login_at?: string;
  created_at: string;
}

export interface EnterpriseUser {
  id: string;
  user_id: string;
  pharmacy_id?: string;
  user_type: EnterpriseUserType;
  status: EnterpriseUserStatus;
  enterprise_role_id?: string;

  // Auth user fields
  username?: string;
  email?: string;
  full_name?: string;
  phone?: string;
  is_active: boolean;

  // Profile
  avatar_url?: string;
  theme_preference?: string;
  language?: string;
  timezone?: string;
  emergency_contact?: Record<string, string>;
  notes?: string;

  // Notification prefs
  notif_email: boolean;
  notif_sms: boolean;
  notif_push: boolean;
  notif_in_app: boolean;
  notif_whatsapp: boolean;

  // Staff info
  employee_id?: string;
  cnic?: string;
  license_number?: string;
  qualification?: string;
  joining_date?: string;
  blood_group?: string;
  address?: string;

  // Security state
  failed_login_count: number;
  force_password_change: boolean;
  password_changed_at?: string;
  password_expires_at?: string;
  two_factor_enabled: boolean;
  otp_enabled: boolean;
  last_login_at?: string;
  last_login_ip?: string;
  last_activity_at?: string;

  // Login restrictions
  allowed_branches?: string[];
  allowed_devices?: string[];
  allowed_ips?: string[];
  allowed_hours?: Record<string, unknown>;
  max_concurrent_sessions: number;
  geo_restriction_enabled: boolean;

  // Relations
  enterprise_role?: RoleListItem;
  branch_assignments: BranchAssignment[];

  created_at: string;
  updated_at?: string;
}

export interface EnterpriseUserCreate {
  username: string;
  email: string;
  password: string;
  full_name?: string;
  phone?: string;
  user_type?: string;
  enterprise_role_id?: string;
  employee_id?: string;
  cnic?: string;
  license_number?: string;
  qualification?: string;
  joining_date?: string;
  blood_group?: string;
  address?: string;
  default_branch_id?: string;
  branch_role?: string;
  force_password_change?: boolean;
  allowed_ips?: string[];
  max_concurrent_sessions?: number;
  notif_email?: boolean;
  notif_sms?: boolean;
  notif_push?: boolean;
  notif_in_app?: boolean;
}

export interface EnterpriseUserUpdate {
  user_type?: string;
  enterprise_role_id?: string;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  theme_preference?: string;
  language?: string;
  timezone?: string;
  notes?: string;
  employee_id?: string;
  cnic?: string;
  license_number?: string;
  qualification?: string;
  joining_date?: string;
  blood_group?: string;
  address?: string;
  notif_email?: boolean;
  notif_sms?: boolean;
  notif_push?: boolean;
  notif_in_app?: boolean;
  max_concurrent_sessions?: number;
  allowed_ips?: string[];
}

// ── List / pagination ───────────────────────────────────────────────────────────

export interface UserListResponse {
  items: EnterpriseUserListItem[];
  total: number;
  page: number;
  pages: number;
  limit: number;
}

export interface UserListParams {
  search?: string;
  status?: string;
  user_type?: string;
  role_id?: string;
  branch_id?: string;
  sort_by?: string;
  sort_dir?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// ── Dashboard ───────────────────────────────────────────────────────────────────

export interface UserDashboardSummary {
  total_users: number;
  active_users: number;
  inactive_users: number;
  suspended_users: number;
  locked_users: number;
  pending_approval: number;
  online_users: number;
  active_sessions: number;
  trusted_devices: number;
  blocked_devices: number;
  failed_logins_today: number;
  pending_approvals: number;
  by_role: Array<{ name: string; count: number }>;
  by_branch: Array<{ name: string; count: number }>;
  by_type: Array<{ type: string; count: number }>;
}

// ── Action payloads ─────────────────────────────────────────────────────────────

export interface PasswordResetRequest {
  new_password?: string;
  force_change?: boolean;
  notify_user?: boolean;
}

export interface SuspendRequest {
  reason: string;
  notify_user?: boolean;
}

export interface LockRequest {
  reason: string;
  permanent?: boolean;
  notify_user?: boolean;
}

export interface ApprovalAction {
  action: 'approve' | 'reject';
  note?: string;
}

// ── Paginated responses ─────────────────────────────────────────────────────────

export interface Paginated<T> {
  items: T[];
  total: number;
}
