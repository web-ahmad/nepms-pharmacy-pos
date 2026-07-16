import { useState } from 'react';
import { Employee } from '../types/hr';
import { useDepartments, useDesignations, useShifts } from '../services/hr.api';
import { X, CalendarDays, Receipt, GraduationCap, FolderOpen, Target, CheckSquare, Activity, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AttendanceLogs from './AttendanceLogs';
import LeavesList from './LeavesList';

interface ViewEmployeeModalProps {
  employee: Employee;
  onClose: () => void;
}

export default function ViewEmployeeModal({ employee, onClose }: ViewEmployeeModalProps) {
  const { data: departments } = useDepartments();
  const { data: designations } = useDesignations();
  const { data: shifts } = useShifts();

  const deptName = departments?.find(d => d.id === employee.department_id)?.name || 'Unknown';
  const desigName = designations?.find(d => d.id === employee.designation_id)?.name || 'Unknown';
  const shiftName = shifts?.find(s => s.id === employee.shift_id)?.name || 'Unknown';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-[95vw] h-[95vh] flex flex-col rounded-2xl bg-white shadow-2xl dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 p-6 dark:border-zinc-800 shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-lg font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
              {employee.first_name?.[0]}{employee.last_name?.[0]}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 leading-none">
                {employee.first_name} {employee.last_name}
              </h2>
              <p className="mt-1 flex gap-3 text-sm font-mono text-zinc-500">
                <span>{employee.employee_id}</span>
                <span className="text-indigo-600 dark:text-indigo-400">@{employee.username}</span>
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${employee.is_active ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'}`}>
                  {employee.is_active ? 'Active' : 'Archived'}
                </span>
              </p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <X size={20} className="text-zinc-500" />
          </button>
        </div>
        
        {/* Main Content Workspace */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <Tabs defaultValue="overview" className="h-full flex flex-col">
            <div className="border-b border-zinc-200 px-6 pt-4 dark:border-zinc-800 shrink-0">
              <TabsList className="bg-transparent space-x-6">
                <TabsTrigger value="overview" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 rounded-none bg-transparent shadow-none gap-2 px-1 pb-3 pt-2">
                  <User size={16} /> Overview
                </TabsTrigger>
                <TabsTrigger value="attendance" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 rounded-none bg-transparent shadow-none gap-2 px-1 pb-3 pt-2">
                  <CalendarDays size={16} /> Attendance
                </TabsTrigger>
                <TabsTrigger value="leave" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 rounded-none bg-transparent shadow-none gap-2 px-1 pb-3 pt-2">
                  <CalendarDays size={16} /> Leave
                </TabsTrigger>
                <TabsTrigger value="payroll" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 rounded-none bg-transparent shadow-none gap-2 px-1 pb-3 pt-2">
                  <Receipt size={16} /> Payroll
                </TabsTrigger>
                <TabsTrigger value="documents" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 rounded-none bg-transparent shadow-none gap-2 px-1 pb-3 pt-2">
                  <FolderOpen size={16} /> Documents
                </TabsTrigger>
                <TabsTrigger value="performance" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 rounded-none bg-transparent shadow-none gap-2 px-1 pb-3 pt-2">
                  <Target size={16} /> Performance
                </TabsTrigger>
                <TabsTrigger value="training" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 rounded-none bg-transparent shadow-none gap-2 px-1 pb-3 pt-2">
                  <GraduationCap size={16} /> Training
                </TabsTrigger>
                <TabsTrigger value="tasks" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 rounded-none bg-transparent shadow-none gap-2 px-1 pb-3 pt-2">
                  <CheckSquare size={16} /> Tasks
                </TabsTrigger>
                <TabsTrigger value="activity" className="data-[state=active]:border-b-2 data-[state=active]:border-indigo-600 data-[state=active]:text-indigo-600 rounded-none bg-transparent shadow-none gap-2 px-1 pb-3 pt-2">
                  <Activity size={16} /> Activity
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-auto bg-zinc-50/50 dark:bg-zinc-900/30 p-6">
              
              <TabsContent value="overview" className="mt-0 h-full">
                <div className="grid grid-cols-2 gap-8 max-w-4xl">
                  {/* Personal Info */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <User size={18} className="text-zinc-400" /> Personal Information
                    </h4>
                    <div className="grid grid-cols-1 gap-4 text-sm bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                      <div>
                        <span className="block text-zinc-500 mb-1">Email</span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{employee.email || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-zinc-500 mb-1">Phone</span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{employee.phone || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-zinc-500 mb-1">CNIC</span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{employee.cnic || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-zinc-500 mb-1">Date of Birth</span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{employee.dob || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-zinc-500 mb-1">Gender</span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{employee.gender || '-'}</span>
                      </div>
                      <div>
                        <span className="block text-zinc-500 mb-1">Address</span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{employee.address || '-'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Employment Info */}
                  <div className="space-y-4">
                    <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                      <FolderOpen size={18} className="text-zinc-400" /> Employment Details
                    </h4>
                    <div className="grid grid-cols-1 gap-4 text-sm bg-white dark:bg-zinc-950 p-6 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                      <div>
                        <span className="block text-zinc-500 mb-1">Department</span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{deptName}</span>
                      </div>
                      <div>
                        <span className="block text-zinc-500 mb-1">Designation</span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{desigName}</span>
                      </div>
                      <div>
                        <span className="block text-zinc-500 mb-1">Shift</span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{shiftName}</span>
                      </div>
                      <div>
                        <span className="block text-zinc-500 mb-1">Date of Joining</span>
                        <span className="font-medium text-zinc-800 dark:text-zinc-200">{employee.join_date}</span>
                      </div>
                      <div>
                        <span className="block text-zinc-500 mb-1">Base Salary</span>
                        <span className="font-medium font-mono text-zinc-800 dark:text-zinc-200">
                          {employee.base_salary ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'PKR' }).format(employee.base_salary) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="attendance" className="mt-0 h-full">
                <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden min-h-[500px]">
                  <AttendanceLogs employeeId={employee.id} hideFilters={true} />
                </div>
              </TabsContent>

              <TabsContent value="leave" className="mt-0 h-full">
                <div className="bg-white dark:bg-zinc-950 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm p-6 overflow-hidden min-h-[500px]">
                  <LeavesList employeeId={employee.id} hideHeader={true} />
                </div>
              </TabsContent>

              {/* Placeholders for future modules */}
              <TabsContent value="payroll" className="mt-0 h-full">
                <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                  <Receipt size={48} className="mb-4 text-zinc-300 dark:text-zinc-700" />
                  <p>Payroll history will be displayed here.</p>
                </div>
              </TabsContent>

              <TabsContent value="documents" className="mt-0 h-full">
                <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                  <FolderOpen size={48} className="mb-4 text-zinc-300 dark:text-zinc-700" />
                  <p>Employee documents management coming soon.</p>
                </div>
              </TabsContent>

              <TabsContent value="performance" className="mt-0 h-full">
                <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                  <Target size={48} className="mb-4 text-zinc-300 dark:text-zinc-700" />
                  <p>Performance reviews and KPIs coming soon.</p>
                </div>
              </TabsContent>

              <TabsContent value="training" className="mt-0 h-full">
                <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                  <GraduationCap size={48} className="mb-4 text-zinc-300 dark:text-zinc-700" />
                  <p>Training programs and attendance coming soon.</p>
                </div>
              </TabsContent>

              <TabsContent value="tasks" className="mt-0 h-full">
                <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                  <CheckSquare size={48} className="mb-4 text-zinc-300 dark:text-zinc-700" />
                  <p>Assigned tasks and checklist tracking coming soon.</p>
                </div>
              </TabsContent>

              <TabsContent value="activity" className="mt-0 h-full">
                <div className="flex flex-col items-center justify-center h-full text-zinc-500">
                  <Activity size={48} className="mb-4 text-zinc-300 dark:text-zinc-700" />
                  <p>Activity timeline coming soon.</p>
                </div>
              </TabsContent>

            </div>
          </Tabs>
        </div>
        
      </div>
    </div>
  );
}
