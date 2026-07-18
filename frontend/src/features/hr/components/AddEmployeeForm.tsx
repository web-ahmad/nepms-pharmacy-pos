import { useState, useEffect, useRef } from 'react';
import { useCreateEmployee, useUpdateEmployee, useDepartments, useDesignations, useShifts } from '../services/hr.api';
import { useRoles } from '@/features/admin/services/admin.api';
import { notify } from '@/utils/toast';
import { useAuthStore } from '@/stores/auth-store';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, KeyRound, Info } from 'lucide-react';

import { Employee } from '../types/hr';

interface AddEmployeeFormProps {
  onClose: () => void;
  isEditing?: boolean;
  initialData?: Employee;
}

export default function AddEmployeeForm({ onClose, isEditing, initialData }: AddEmployeeFormProps) {
  const [firstName, setFirstName] = useState(initialData?.first_name || '');
  const [lastName, setLastName] = useState(initialData?.last_name || '');
  const [cnic, setCnic] = useState(initialData?.cnic || '');
  const [phone, setPhone] = useState(initialData?.phone || '');
  const [email, setEmail] = useState(initialData?.email || '');
  const [address, setAddress] = useState(initialData?.address || '');
  const [dob, setDob] = useState(initialData?.dob || '');
  const [gender, setGender] = useState(initialData?.gender || '');

  const [departmentId, setDepartmentId] = useState(initialData?.department_id || '');
  const [designationId, setDesignationId] = useState(initialData?.designation_id || '');
  const [shiftId, setShiftId] = useState(initialData?.shift_id || '');
  const [joinDate, setJoinDate] = useState(initialData?.join_date || new Date().toISOString().split('T')[0]);

  const [username, setUsername] = useState(initialData?.username || '');

  // Attendance Rules
  const [weekendDays, setWeekendDays] = useState<string[]>(initialData?.weekend_days || []);
  const [overtimeAllowed, setOvertimeAllowed] = useState(initialData?.overtime_allowed || false);
  const [standardBreakTime, setStandardBreakTime] = useState(initialData?.standard_break_time || 60);

  // System Access
  const [systemAccess, setSystemAccess] = useState(false);
  const [password, setPassword] = useState('');
  const [roleId, setRoleId] = useState('');

  const { data: departments } = useDepartments();
  const { data: designations } = useDesignations();
  const { data: shifts } = useShifts();
  const { data: roles } = useRoles();

  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee(initialData?.id || '');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const { branchId: activeBranchId } = useAuthStore();

  // Auto-generate username only if not editing or if username is empty
  useEffect(() => {
    if (!isEditing && (firstName || lastName)) {
      const generated = `${firstName.toLowerCase().trim()}.${lastName.toLowerCase().trim()}`.replace(/\s+/g, '');
      setUsername(generated);
    }
  }, [firstName, lastName, isEditing]);

  // Reset designation when department changes, but not on initial load for edit okey
  useEffect(() => {
    if (initialData?.department_id !== departmentId) {
      setDesignationId('');
    }
  }, [departmentId, initialData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      const payload = {
        first_name: firstName,
        last_name: lastName,
        cnic,
        phone,
        email,
        address,
        dob,
        gender,
        username,
        department_id: departmentId,
        designation_id: designationId,
        shift_id: shiftId,
        branch_id: initialData?.branch_id || activeBranchId || null,
        join_date: joinDate,
        weekend_days: weekendDays,
        overtime_allowed: overtimeAllowed,
        standard_break_time: standardBreakTime,
        is_active: initialData ? initialData.is_active : true,
        ...(systemAccess && !isEditing ? {
          system_access: true,
          password,
          role_id: roleId,
        } : {})
      };

      if (isEditing && initialData) {
        await updateMutation.mutateAsync(payload);
        onClose();
        notify.success('Employee updated successfully');
      } else {
        await createMutation.mutateAsync(payload);
        onClose();
        notify.success('Employee created successfully');
      }
    } catch (err: any) {
      const data = err.response?.data;
      const exactMessage =
        (typeof data === 'string' && data ? data : null) ||
        data?.detail ||
        data?.error ||
        data?.message ||
        (Array.isArray(data?.detail)
          ? `${data.detail[0]?.loc?.join('.')}: ${data.detail[0]?.msg}`
          : data?.detail) ||
        err.message ||
        'Failed to save employee. Please try again.';
      notify.error(exactMessage);
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const isPending = isSubmitting || (isEditing ? updateMutation.isPending : createMutation.isPending);

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="mb-6 text-lg font-bold text-zinc-900 dark:text-zinc-50">
        {isEditing ? 'Edit Employee' : 'Add New Employee'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100 border-b pb-2 dark:border-zinc-800">Personal Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">First Name <span className="text-red-500">*</span></label>
              <input required value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Last Name <span className="text-red-500">*</span></label>
              <input required value={lastName} onChange={e => setLastName(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">CNIC <span className="text-red-500">*</span></label>
              <input required value={cnic} onChange={e => setCnic(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Phone Number <span className="text-red-500">*</span></label>
              <input required value={phone} onChange={e => setPhone(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email {systemAccess && <span className="text-red-500">*</span>}
              </label>
              <input type="email" required={systemAccess} value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Date of Birth</label>
              <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Address</label>
              <input value={address} onChange={e => setAddress(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100 border-b pb-2 dark:border-zinc-800">Employment Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Department <span className="text-red-500">*</span></label>
              <select required value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                <option value="">Select Department</option>
                {departments?.filter(d => d.is_active).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Designation <span className="text-red-500">*</span></label>
              <select required value={designationId} onChange={e => setDesignationId(e.target.value)} disabled={!departmentId} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 disabled:opacity-50">
                <option value="">Select Designation</option>
                {designations?.filter(d => d.department_id === departmentId && d.is_active).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Shift Allocation <span className="text-red-500">*</span></label>
              <select required value={shiftId} onChange={e => setShiftId(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
                <option value="">Select Shift</option>
                {shifts?.map(s => <option key={s.id} value={s.id}>{s.name} ({s.start_time} - {s.end_time})</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Date of Joining <span className="text-red-500">*</span></label>
              <input type="date" required value={joinDate} onChange={e => setJoinDate(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-4 text-sm font-semibold text-zinc-900 dark:text-zinc-100 border-b pb-2 dark:border-zinc-800">Attendance Rules</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Standard Break Time (Minutes)</label>
              <input type="number" min="0" required value={standardBreakTime} onChange={e => setStandardBreakTime(parseInt(e.target.value) || 0)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input type="checkbox" id="overtimeAllowed" checked={overtimeAllowed} onChange={e => setOvertimeAllowed(e.target.checked)} className="h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900" />
              <label htmlFor="overtimeAllowed" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 cursor-pointer">Overtime Allowed</label>
            </div>
            <div className="col-span-2">
              <label className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Custom Weekend Days</label>
              <div className="flex flex-wrap gap-3">
                {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map(day => (
                  <label key={day} className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300 cursor-pointer bg-zinc-50 dark:bg-zinc-900/50 px-3 py-1.5 rounded-full border border-zinc-200 dark:border-zinc-800">
                    <input
                      type="checkbox"
                      checked={weekendDays.includes(day)}
                      onChange={(e) => {
                        if (e.target.checked) setWeekendDays([...weekendDays, day]);
                        else setWeekendDays(weekendDays.filter(d => d !== day));
                      }}
                      className="h-3.5 w-3.5 rounded border-zinc-300 text-blue-600 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900"
                    />
                    {day}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
          <h3 className="mb-2 text-sm font-semibold text-blue-900 dark:text-blue-100">Auto-Generated Account Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-blue-800 dark:text-blue-200">Employee ID</label>
              <input disabled value={initialData?.employee_id || "EMP-[Auto-Generated]"} className="w-full rounded-md border border-blue-200 bg-blue-50/50 px-3 py-2 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-100 cursor-not-allowed" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-blue-800 dark:text-blue-200">Username</label>
              <input disabled value={username} placeholder="auto.generated" className="w-full rounded-md border border-blue-200 bg-blue-50/50 px-3 py-2 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-100 cursor-not-allowed" />
            </div>
          </div>
        </div>

        {!isEditing && (
          <div className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-500" /> Enable System Access (Create Login)
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Automatically create a user account for this employee to access the portal.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={systemAccess}
                onClick={() => setSystemAccess(!systemAccess)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 dark:focus:ring-offset-zinc-950 ${
                  systemAccess ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-700'
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    systemAccess ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <AnimatePresence>
              {systemAccess && (
                <motion.div
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: 'auto', opacity: 1, marginTop: 24 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  className="overflow-hidden"
                >
                  <div className="rounded-md bg-blue-50 p-3 flex items-start gap-3 mb-5 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50">
                    <Info className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-blue-700 dark:text-blue-300 leading-tight">
                      The employee's email address will be required and used as their login username.
                    </p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Password <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <KeyRound className="h-4 w-4 text-zinc-400" />
                        </div>
                        <input
                          type="text"
                          required={systemAccess}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Set a strong password"
                          className="w-full rounded-md border border-zinc-300 pl-10 pr-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Assign Role <span className="text-red-500">*</span>
                      </label>
                      <select
                        required={systemAccess}
                        value={roleId}
                        onChange={(e) => setRoleId(e.target.value)}
                        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      >
                        <option value="">Select a Role</option>
                        {roles?.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        <div className="flex justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <button type="button" onClick={onClose} className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
            Cancel
          </button>
          <button type="submit" disabled={isPending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
            {isPending ? 'Saving...' : (isEditing ? 'Update Employee' : 'Save Employee')}
          </button>
        </div>
      </form>
    </div>
  );
}
