import { useState, useEffect } from 'react';
import { useCreateEmployee, useDepartments, useDesignations, useShifts } from '../services/hr.api';
import { notify } from '@/utils/toast';

interface AddEmployeeFormProps {
  onClose: () => void;
}

export default function AddEmployeeForm({ onClose }: AddEmployeeFormProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cnic, setCnic] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  
  const [departmentId, setDepartmentId] = useState('');
  const [designationId, setDesignationId] = useState('');
  const [shiftId, setShiftId] = useState('');
  const [joinDate, setJoinDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [username, setUsername] = useState('');

  const { data: departments } = useDepartments();
  const { data: designations } = useDesignations();
  const { data: shifts } = useShifts();
  
  const createMutation = useCreateEmployee();

  // Auto-generate username
  useEffect(() => {
    if (firstName || lastName) {
      const generated = `${firstName.toLowerCase().trim()}.${lastName.toLowerCase().trim()}`.replace(/\s+/g, '');
      setUsername(generated);
    } else {
      setUsername('');
    }
  }, [firstName, lastName]);

  // Reset designation when department changes
  useEffect(() => {
    setDesignationId('');
  }, [departmentId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
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
        join_date: joinDate,
        is_active: true,
      });
      notify.success('Employee created successfully');
      onClose();
    } catch (err) {
      console.error(err);
      notify.error('Failed to create employee');
    }
  };

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <h2 className="mb-6 text-lg font-bold text-zinc-900 dark:text-zinc-50">Add New Employee</h2>
      
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
              <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">Email (Optional)</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" />
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

        <div className="rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
          <h3 className="mb-2 text-sm font-semibold text-blue-900 dark:text-blue-100">Auto-Generated Account Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-blue-800 dark:text-blue-200">Employee ID</label>
              <input disabled value="EMP-[Auto-Generated]" className="w-full rounded-md border border-blue-200 bg-blue-50/50 px-3 py-2 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-100 cursor-not-allowed" />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-blue-800 dark:text-blue-200">Username</label>
              <input disabled value={username} placeholder="auto.generated" className="w-full rounded-md border border-blue-200 bg-blue-50/50 px-3 py-2 text-sm text-blue-900 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-100 cursor-not-allowed" />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <button type="button" onClick={onClose} className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800">
            Cancel
          </button>
          <button type="submit" disabled={createMutation.isPending} className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50">
            {createMutation.isPending ? 'Saving...' : 'Save Employee'}
          </button>
        </div>
      </form>
    </div>
  );
}
