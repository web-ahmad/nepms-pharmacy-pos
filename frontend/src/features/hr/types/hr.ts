export interface Department {
  id: string;
  name: string;
}

export interface Designation {
  id: string;
  name: string;
}

export interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  department_id: string;
  designation_id: string;
  join_date: string;
  base_salary: number;
  is_active: boolean;
  created_at: string;
}

export interface Shift {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
}

export interface Attendance {
  id: string;
  employee_id: string;
  date: string;
  clock_in?: string;
  clock_out?: string;
  status: string;
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
}

export interface PayrollLine {
  id: string;
  employee_id: string;
  base_salary: number;
  allowances: number;
  deductions: number;
  net_pay: number;
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
}
