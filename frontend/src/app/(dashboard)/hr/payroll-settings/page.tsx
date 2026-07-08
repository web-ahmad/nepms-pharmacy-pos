'use client';

import { useState, useEffect } from 'react';
import { Settings2, Plus, Edit2, Trash2, X } from 'lucide-react';
import { api } from '@/services/api';

interface PayrollSetting {
  id: string;
  employee_id: string;
  employee_name: string;
  grace_period_mins: number;
  ot_type: string;
  ot_rate: number;
  ut_type: string;
  ut_rate: number;
  bonus_amount: number;
}

export default function PayrollSettingsPage() {
  const [settings, setSettings] = useState<PayrollSetting[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRule, setCurrentRule] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [settingsRes, empRes] = await Promise.all([
        api.get('/api/v1/hr/payroll-settings'),
        api.get('/api/v1/hr/employees')
      ]);
      setSettings(settingsRes.data);
      setEmployees(empRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this setting?')) return;
    try {
      await api.delete(`/api/v1/hr/payroll-settings/${id}`);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete setting');
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData(e.target as HTMLFormElement);
    const payload = {
      employee_id: fd.get('employee_id'),
      grace_period_mins: parseInt(fd.get('grace_period_mins') as string) || 15,
      ot_type: fd.get('ot_type'),
      ot_rate: parseFloat(fd.get('ot_rate') as string) || 0,
      ut_type: fd.get('ut_type'),
      ut_rate: parseFloat(fd.get('ut_rate') as string) || 0,
      bonus_amount: parseFloat(fd.get('bonus_amount') as string) || 0,
    };

    try {
      if (currentRule) {
        await api.put(`/api/v1/hr/payroll-settings/${currentRule.id}`, payload);
      } else {
        await api.post('/api/v1/hr/payroll-settings/', payload);
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.detail || 'Operation failed');
    }
  };

  const openModal = (rule: any = null) => {
    setCurrentRule(rule);
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
            <Settings2 className="h-4 w-4 text-emerald-700 dark:text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900 dark:text-zinc-100">Payroll Rules</h2>
            <p className="text-xs text-gray-400 dark:text-zinc-500">Manage individual OT/UT rates and bonuses</p>
          </div>
        </div>
        <button
          onClick={() => openModal()}
          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          <Plus size={14} /> Add Rule
        </button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900/50">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50/50 text-xs font-medium text-gray-500 dark:border-zinc-800 dark:bg-zinc-800/20 dark:text-zinc-400">
              <tr>
                <th className="px-4 py-3">Employee</th>
                <th className="px-4 py-3">Grace Period</th>
                <th className="px-4 py-3">OT Rule</th>
                <th className="px-4 py-3">UT Rule</th>
                <th className="px-4 py-3">Bonus</th>
                <th className="px-4 py-3 w-[100px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-zinc-800">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-4 text-gray-400">Loading...</td></tr>
              ) : settings.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-4 text-gray-400">No payroll rules found</td></tr>
              ) : (
                settings.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-zinc-100">{s.employee_name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-zinc-300">{s.grace_period_mins} mins</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-zinc-300">
                      {s.ot_rate > 0 ? `${s.ot_type === 'PERCENTAGE' ? s.ot_rate + '%' : 'Rs ' + s.ot_rate}` : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-zinc-300">
                      {s.ut_rate > 0 ? `${s.ut_type === 'PERCENTAGE' ? s.ut_rate + '%' : 'Rs ' + s.ut_rate}` : 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-zinc-300">
                      {s.bonus_amount > 0 ? `Rs ${s.bonus_amount}` : 'N/A'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => openModal(s)} className="text-gray-400 hover:text-blue-500"><Edit2 size={15} /></button>
                        <button onClick={() => handleDelete(s.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl dark:bg-zinc-900 border dark:border-zinc-800">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-zinc-100">
                {currentRule ? 'Edit Payroll Rule' : 'New Payroll Rule'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="space-y-4 text-sm">
              {!currentRule && (
                <div>
                  <label className="mb-1 block font-medium text-gray-700 dark:text-zinc-300">Employee</label>
                  <select name="employee_id" required className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white">
                    <option value="">Select Employee...</option>
                    {employees.map(e => (
                      <option key={e.id} value={e.id}>{e.first_name} {e.last_name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block font-medium text-gray-700 dark:text-zinc-300">Grace Period (Minutes)</label>
                <input type="number" name="grace_period_mins" defaultValue={currentRule?.grace_period_mins || 15} required className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-gray-700 dark:text-zinc-300">OT Type</label>
                  <select name="ot_type" defaultValue={currentRule?.ot_type || 'FIXED_AMOUNT'} className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white">
                    <option value="FIXED_AMOUNT">Fixed (Rs)</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-medium text-gray-700 dark:text-zinc-300">OT Rate</label>
                  <input type="number" step="any" name="ot_rate" defaultValue={currentRule?.ot_rate || 0} className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-medium text-gray-700 dark:text-zinc-300">UT Type</label>
                  <select name="ut_type" defaultValue={currentRule?.ut_type || 'FIXED_AMOUNT'} className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white">
                    <option value="FIXED_AMOUNT">Fixed (Rs)</option>
                    <option value="PERCENTAGE">Percentage (%)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block font-medium text-gray-700 dark:text-zinc-300">UT Rate</label>
                  <input type="number" step="any" name="ut_rate" defaultValue={currentRule?.ut_rate || 0} className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
                </div>
              </div>

              <div>
                <label className="mb-1 block font-medium text-gray-700 dark:text-zinc-300">Fixed Bonus (Monthly)</label>
                <input type="number" step="any" name="bonus_amount" defaultValue={currentRule?.bonus_amount || 0} className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 outline-none focus:border-emerald-500 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white" />
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button type="button" onClick={() => setIsModalOpen(false)} className="rounded-lg px-4 py-2 font-medium text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-zinc-800">
                  Cancel
                </button>
                <button type="submit" className="rounded-lg bg-emerald-600 px-4 py-2 font-medium text-white hover:bg-emerald-700">
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
