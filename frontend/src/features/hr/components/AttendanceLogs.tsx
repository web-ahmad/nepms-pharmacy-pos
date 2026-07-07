'use client';

import { useState, useRef } from 'react';
import { useAttendance, useEmployees, useBulkAttendance, useDepartments } from '../services/hr.api';
import { Attendance, BulkAttendanceRow } from '../types/hr';
import {
  CalendarDays,
  Search,
  ChevronDown,
  Clock,
  LogIn,
  LogOut,
  AlertCircle,
  CheckCircle2,
  Timer,
  Pencil,
  Loader2,
  Upload,
  Eye,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';
import EditAttendanceModal from './EditAttendanceModal';
import MarkMonthlyModal from './MarkMonthlyModal';
import AttendanceDetailView from './AttendanceDetailView';

// ─── Helpers ─────────────────────────────────────────────────────────
function todayISO() {
  return new Date().toISOString().split('T')[0];
}

function formatTime(isoString?: string) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function formatHours(hours?: number) {
  if (hours == null) return '—';
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const STATUS_STYLE: Record<string, string> = {
  Present:
    'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  Late: 'bg-orange-100 text-orange-700 dark:bg-orange-500/10 dark:text-orange-400',
  Absent: 'bg-red-100 text-red-700 dark:bg-red-500/10 dark:text-red-400',
  'Half Day':
    'bg-yellow-100 text-yellow-700 dark:bg-yellow-500/10 dark:text-yellow-400',
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  Present: <CheckCircle2 size={12} />,
  Late: <AlertCircle size={12} />,
  Absent: <AlertCircle size={12} />,
  'Half Day': <Clock size={12} />,
};

// ─── Component ───────────────────────────────────────────────────────
export default function AttendanceLogs() {
  const [dateFilter, setDateFilter] = useState<string>(todayISO());
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);
  const [viewingEmployee, setViewingEmployee] = useState<any | null>(null);
  const [isMarkMonthlyOpen, setIsMarkMonthlyOpen] = useState(false);

  const { data: logs, isLoading } = useAttendance(dateFilter);
  const { data: employees } = useEmployees();
  const { data: departments } = useDepartments();
  const { mutateAsync: bulkUpload, isPending: isUploading } = useBulkAttendance();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Client-side search by employee name or shift, and filter by department
  const filtered = (logs ?? []).filter((rec) => {
    const emp = employees?.find((e) => e.id === rec.employee_id);
    if (departmentFilter && emp?.department_id !== departmentFilter) return false;

    const name = rec.employee_name?.toLowerCase() ?? '';
    const shift = rec.shift_name?.toLowerCase() ?? '';
    const q = searchTerm.toLowerCase();
    return name.includes(q) || shift.includes(q);
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        // Parse CSV/Excel using xlsx and get JSON array
        // Expected columns: [Employee ID, Date (YYYY-MM-DD), Clock In (HH:mm), Clock Out (HH:mm)]
        const rows: any[] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        
        // Skip header row
        const payload: BulkAttendanceRow[] = [];
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row[0] || !row[1]) continue; // Needs at least ID and Date

          payload.push({
            employee_id: String(row[0]).trim(),
            date: String(row[1]).trim(),
            clock_in: row[2] ? String(row[2]).trim() : undefined,
            clock_out: row[3] ? String(row[3]).trim() : undefined,
          });
        }

        if (payload.length === 0) {
          toast.error("No valid data found in CSV");
          return;
        }

        const res = await bulkUpload(payload);
        
        if (res.errors && res.errors.length > 0) {
          toast.warning(`Uploaded: ${res.created}, Skipped: ${res.skipped}, Errors: ${res.errors.length}`);
          console.warn("Bulk Upload Errors:", res.errors);
        } else {
          toast.success(`Successfully uploaded ${res.created} records (Skipped: ${res.skipped})`);
        }
      } catch (err) {
        console.error(err);
        toast.error("Failed to parse CSV file");
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search & Buttons */}
        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-400" />
            <input
              id="att-logs-search"
              type="text"
              placeholder="Search employee or shift…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder-zinc-400 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            />
          </div>
          
          <button 
            onClick={() => setIsMarkMonthlyOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <CalendarDays size={16} />
            <span className="hidden sm:inline">Mark Monthly</span>
          </button>

          {/* Hidden File Input */}
          <input 
            type="file" 
            accept=".csv, .xlsx" 
            ref={fileInputRef}
            className="hidden" 
            onChange={handleFileUpload} 
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800 disabled:opacity-50"
          >
            {isUploading ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            <span className="hidden sm:inline">Import CSV</span>
          </button>
        </div>

        {/* Date Picker */}
        <div className="relative flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-zinc-400" />
          <input
            id="att-logs-date"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        {/* Department Filter */}
        <div className="relative flex items-center gap-2">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          >
            <option value="">All Departments</option>
            {departments?.filter(d => d.is_active).map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary row */}
      <div className="flex flex-wrap gap-3">
        {(['Present', 'Late', 'Absent'] as const).map((status) => {
          const count = (logs ?? []).filter((r) => r.status === status).length;
          return (
            <div
              key={status}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[status] ?? ''}`}
            >
              {STATUS_ICON[status]}
              {status}: {count}
            </div>
          );
        })}
      </div>

      {/* Data Grid */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            {/* Head */}
            <thead className="border-b border-zinc-200 bg-zinc-50/70 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900/60">
              <tr>
                <th className="px-4 py-4 w-10 text-center"><input type="checkbox" className="rounded border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900" /></th>
                <th className="px-2 py-4 w-10"></th>
                <th className="px-6 py-4">Employee</th>
                <th className="px-6 py-4 whitespace-nowrap"><span className="flex items-center gap-1.5"><LogIn size={13} /> Check In At</span></th>
                <th className="px-6 py-4 whitespace-nowrap"><span className="flex items-center gap-1.5"><LogOut size={13} /> Check Out At</span></th>
                <th className="px-6 py-4 whitespace-nowrap"><span className="flex items-center gap-1.5"><Timer size={13} /> Worked Hour</span></th>
                <th className="px-6 py-4 whitespace-nowrap">Break Time</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4">Shift</th>
                <th className="px-6 py-4">Overtime</th>
                <th className="px-6 py-4 text-right">Action</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {isLoading && (
                <>
                  {[...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {[...Array(8)].map((__, j) => (
                        <td key={j} className="px-6 py-4">
                          <div className="h-4 rounded bg-zinc-100 dark:bg-zinc-800" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </>
              )}

              {!isLoading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={8}
                    className="py-16 text-center text-zinc-400 dark:text-zinc-600"
                  >
                    <CalendarDays className="mx-auto mb-3 h-8 w-8 opacity-40" />
                    <p className="font-medium">No attendance records found</p>
                    <p className="mt-0.5 text-xs">
                      Try a different date or search term.
                    </p>
                  </td>
                </tr>
              )}

              {!isLoading &&
                filtered.map((rec) => {
                  const emp = employees?.find((e) => e.id === rec.employee_id);
                  const name =
                    rec.employee_name ||
                    (emp
                      ? `${emp.first_name} ${emp.last_name}`
                      : rec.employee_id);
                  const initials = getInitials(name);
                  const statusStyle =
                    STATUS_STYLE[rec.status] ??
                    'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400';

                  return (
                    <tr
                      key={rec.id}
                      className="transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/40"
                    >
                      <td className="px-4 py-4 text-center">
                        <input type="checkbox" className="rounded border-zinc-300 dark:border-zinc-700 dark:bg-zinc-900" />
                      </td>
                      <td className="px-2 py-4 text-center">
                        <button onClick={() => setViewingEmployee(emp || null)} className="text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                          <Eye size={16} />
                        </button>
                      </td>
                      {/* Employee */}
                      <td className="whitespace-nowrap px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400">
                            {initials}
                          </div>
                          <div>
                            <p className="font-medium text-zinc-900 dark:text-zinc-100">
                              {name}
                            </p>
                            <p className="text-xs text-zinc-500">
                              {emp?.employee_id || '—'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Check In */}
                      <td className="whitespace-nowrap px-6 py-4">
                        {rec.clock_in ? (
                          <span className="font-mono text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            {formatTime(rec.clock_in)}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Check Out */}
                      <td className="whitespace-nowrap px-6 py-4">
                        {rec.clock_out ? (
                          <span className="font-mono text-xs font-medium text-red-500 dark:text-red-400">
                            {formatTime(rec.clock_out)}
                          </span>
                        ) : rec.clock_in ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400">
                            <span className="relative flex h-1.5 w-1.5">
                              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            </span>
                            Active
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Worked Hour */}
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                        {formatHours(rec.total_hours_worked)}
                      </td>

                      {/* Break Time */}
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                        {rec.break_time ? `${rec.break_time}h` : '—'}
                      </td>

                      {/* Status Badge */}
                      <td className="whitespace-nowrap px-6 py-4 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusStyle}`}
                        >
                          {STATUS_ICON[rec.status]}
                          {rec.status}
                        </span>
                      </td>

                      {/* Shift Name */}
                      <td className="whitespace-nowrap px-6 py-4">
                        {rec.shift_name ? (
                          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                            {rec.shift_name}
                          </span>
                        ) : (
                          <span className="text-zinc-400">—</span>
                        )}
                      </td>

                      {/* Overtime */}
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-xs text-zinc-700 dark:text-zinc-300">
                        {rec.overtime ? <span className="text-emerald-600 font-semibold">+{rec.overtime}h</span> : '—'}
                      </td>

                      {/* Actions */}
                      <td className="whitespace-nowrap px-6 py-4 text-right">
                        <button
                          title="Edit attendance"
                          onClick={() => setEditingRecord(rec)}
                          className="rounded-md p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
                        >
                          <Pencil size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!isLoading && filtered.length > 0 && (
          <div className="border-t border-zinc-100 px-6 py-3 dark:border-zinc-800">
            <p className="text-xs text-zinc-500">
              {filtered.length} record{filtered.length !== 1 ? 's' : ''} for{' '}
              <span className="font-medium text-zinc-700 dark:text-zinc-300">
                {new Date(dateFilter).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </span>
            </p>
          </div>
        )}
      </div>

      <EditAttendanceModal 
        isOpen={!!editingRecord} 
        onClose={() => setEditingRecord(null)} 
        record={editingRecord} 
      />

      <MarkMonthlyModal
        isOpen={isMarkMonthlyOpen}
        onClose={() => setIsMarkMonthlyOpen(false)}
      />
      <AttendanceDetailView
        isOpen={!!viewingEmployee}
        employee={viewingEmployee}
        onClose={() => setViewingEmployee(null)}
      />
    </div>
  );
}
