"use client";
import ReportPageShell from '@/features/reports/components/ReportPageShell';
import { HardHat, Users, CalendarCheck, Clock, DollarSign, CreditCard, Building } from 'lucide-react';

const TABS = [
  { id: 'hr_employee_directory',  label: 'Employee Directory', icon: Users,         description: 'Complete employee master list with department, salary, and status' },
  { id: 'hr_department_headcount',label: 'Dept. Headcount',   icon: Building,      description: 'Department-wise headcount, active/inactive split, and salary cost' },
  { id: 'hr_attendance_summary',  label: 'Attendance',         icon: CalendarCheck, description: 'Present, absent, late, half-day, and overtime totals per employee' },
  { id: 'hr_leave_report',        label: 'Leave Requests',     icon: Clock,         description: 'All leave applications with type, dates, reason, and approval status' },
  { id: 'hr_payroll_summary',     label: 'Payroll',            icon: DollarSign,    description: 'Salary breakdown: base, allowances, OT, bonuses, deductions, net pay' },
  { id: 'hr_advance_salary',      label: 'Salary Advances',    icon: CreditCard,    description: 'Advance salary requests, deduction month, and approval status' },
];

export default function HRReportsPage() {
  return <ReportPageShell title="HR & Payroll Reports" icon={HardHat} accent="amber" tabs={TABS} />;
}
