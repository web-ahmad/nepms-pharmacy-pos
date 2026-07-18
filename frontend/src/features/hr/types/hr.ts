export interface Department {
  id: string;
  name: string;
  description?: string;
  head_id?: string;
  is_active: boolean;
  employee_count?: number;
}

export interface Designation {
  id: string;
  name: string;
  department_id: string;
  description?: string;
  is_active: boolean;
  employee_count?: number;
  department_name?: string;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  cnic?: string;
  address?: string;
  dob?: string;
  gender?: string;
  employee_id?: string;
  employee_code?: string;
  username?: string;
  user_id?: string;
  branch_id?: string | null;
  shift_id?: string;
  department_id: string;
  designation_id: string;
  join_date: string;
  base_salary?: number;
  salary_type?: string;
  account_no?: string;

  weekend_days?: string[];
  overtime_allowed?: boolean;
  standard_break_time?: number;

  is_active: boolean;
  created_at: string;
}

export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  grace_period?: number;
  is_active?: boolean;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  clock_in?: string;
  clock_out?: string;
  status: string;
  leave_type?: string;
  // Enriched fields from admin logs endpoint
  employee_name?: string;
  shift_name?: string;
  total_hours_worked?: number;
  break_time?: number;
  overtime?: number;
  
  // Phase 10 Extended
  device?: string;
  biometric_id?: string;
  gps_location?: string;
  late_minutes?: number;
  early_exit?: boolean;
}

export interface ClockInRequest {
  employee_id: string;
}

export interface ClockOutRequest {
  attendance_id: string;
}

export interface AttendanceUpdate {
  clock_in?: string;
  clock_out?: string;
  status?: string;
}

export interface BulkAttendanceRow {
  employee_id?: string;
  employeeId?: string;
  date: string;
  clock_in?: string;
  clock_out?: string;
  checkInAt?: string;
  checkOutAt?: string;
  workedHour?: number;
  breakTime?: number;
  overtime?: number;
  status?: string;
  shiftId?: string;
}

export interface BulkAttendanceResponse {
  created: number;
  skipped: number;
  errors: string[];
}

export interface AttendanceWeeklySummaryDay {
  date: string;
  label: string;
  present: number;
  late: number;
  absent: number;
}

export interface AttendanceWeeklySummaryResponse {
  days: AttendanceWeeklySummaryDay[];
}

export interface LeaveRequest {
  id: string;
  employee_id: string;
  leave_type: string;
  start_date: string;
  end_date: string;
  reason: string;
  status: string;
  approved_by?: string;
  created_at: string;
  employee_name?: string;
}

export interface PayrollLine {
  id: string;
  payroll_run_id: string;
  employee_id: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  net_pay: number;
  employee_name?: string;
  department_name?: string;
  
  // Phase 10 Extended
  overtime?: number;
  bonuses?: number;
  incentives?: number;
  tax?: number;
  provident_fund?: number;
  bank_reference?: string;
}

export interface PayrollRun {
  id: string;
  month: number;
  year: number;
  total_gross: number;
  total_deductions: number;
  total_net: number;
  status: string;
  created_at: string;
  lines: PayrollLine[];
}

export interface HRAnalytics {
  total_employees: number;
  active_employees: number;
  attendance_percent: number;
  pending_leaves: number;
  monthly_payroll_cost: number;
  
  // Phase 10 Extended
  present_today?: number;
  absent_today?: number;
  late_today?: number;
  on_leave_today?: number;
  pending_reviews?: number;
  open_tasks?: number;
  training_progress?: number;
  expiring_documents?: number;
}

export interface AdvanceSalary {
  id: string;
  employee_id: string;
  amount: number;
  request_date: string;
  deduction_month: string;
  reason?: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Paid';
  approved_by?: string;
  employee_name?: string;
  created_at?: string;
}

// ============================================================================
// Phase 10 New Interfaces
// ============================================================================

export interface EmployeeDocument {
  id: string;
  employee_id: string;
  document_type: string;
  file_path: string;
  expiry_date?: string;
  verification_status: string; // 'Pending' | 'Verified' | 'Rejected'
  uploaded_by?: string;
  created_at: string;
  employee_name?: string;
}

export interface PerformanceReview {
  id: string;
  employee_id: string;
  reviewer_id?: string;
  review_period: string; // e.g., 'Q1 2026'
  goals?: string;
  achievements?: string;
  rating?: number;
  status: string; // 'Draft' | 'Submitted' | 'Acknowledged'
  created_at: string;
  employee_name?: string;
  reviewer_name?: string;
}

export interface EmployeeTask {
  id: string;
  employee_id: string;
  title: string;
  description?: string;
  due_date?: string;
  status: string; // 'Pending' | 'In Progress' | 'Completed' | 'Cancelled'
  priority?: string; // 'Low' | 'Medium' | 'High'
  assigned_by?: string;
  created_at: string;
  employee_name?: string;
}

export interface TrainingProgram {
  id: string;
  title: string;
  description?: string;
  trainer?: string;
  start_date: string;
  end_date: string;
  capacity?: number;
  status: string; // 'Scheduled' | 'Ongoing' | 'Completed' | 'Cancelled'
  created_at: string;
}

export interface TrainingAttendance {
  id: string;
  program_id: string;
  employee_id: string;
  status: string; // 'Registered' | 'Attended' | 'Missed' | 'Completed'
  completion_percentage?: number;
  certificate_url?: string;
  created_at: string;
  employee_name?: string;
  program_name?: string;
}
