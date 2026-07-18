'use client';
// features/users/components/CreateUserWizard.tsx
// 3-step wizard: Identity → Role & Access → Review

import { useState, useEffect, useMemo } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User, Shield, ClipboardCheck,
  ChevronLeft, ChevronRight, Loader2, CheckCircle2, X, Link as LinkIcon
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useCreateUser } from '../services/user.api';
import { useEnterpriseRoles } from '../services/role.api';
import { useEmployees } from '@/features/hr/services/hr.api';
import type { EnterpriseUserCreate } from '../types/user';
import { USER_TYPE_LABELS } from '../types/user';

// ── Zod schema ────────────────────────────────────────────────────────────────

const schema = z.object({
  // Step 1
  employee_id:          z.string().optional(),
  username:             z.string().min(3, 'Username must be at least 3 characters'),
  email:                z.string().email('Invalid email'),
  password:             z.string().min(8, 'Password must be at least 8 characters'),
  full_name:            z.string().optional(),
  phone:                z.string().optional(),
  force_password_change: z.boolean().optional(),

  // Step 2
  user_type:            z.string().optional(),
  enterprise_role_id:   z.string().optional(),
  max_concurrent_sessions: z.coerce.number().int().min(1).max(20).optional(),
  allowed_ips:          z.string().optional(), // comma-separated, parsed on submit

  // Notification prefs
  notif_email:    z.boolean().optional(),
  notif_sms:      z.boolean().optional(),
  notif_push:     z.boolean().optional(),
  notif_in_app:   z.boolean().optional(),
});

type FormValues = z.infer<typeof schema>;

// ── Step components ───────────────────────────────────────────────────────────

function Step1({ register, errors, setValue, watch, employees }: { register: any; errors: any; setValue: any; watch: any; employees: any[] }) {
  const selectedEmployeeId = watch('employee_id');
  const isLinked = !!selectedEmployeeId;

  // Sync data when employee changes
  useEffect(() => {
    if (selectedEmployeeId) {
      const emp = employees.find(e => e.id === selectedEmployeeId);
      if (emp) {
        setValue('full_name', `${emp.first_name || ''} ${emp.last_name || ''}`.trim(), { shouldValidate: true });
        if (emp.phone) setValue('phone', emp.phone, { shouldValidate: true });
        if (emp.email && !watch('email')) setValue('email', emp.email, { shouldValidate: true });
      }
    } else {
      // If unlinked, we don't automatically clear to allow manual entry,
      // but you could if desired.
    }
  }, [selectedEmployeeId, employees, setValue, watch]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Identity</h3>
      </div>

      {/* Bridge: Select Existing Employee */}
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 dark:border-indigo-900/30 dark:bg-indigo-900/10 p-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-indigo-700 dark:text-indigo-400 mb-2">
          <LinkIcon size={16} /> 🔗 Select Existing Employee (Optional)
        </label>
        <p className="text-xs text-indigo-600/80 dark:text-indigo-400/80 mb-3">
          Linking an employee will auto-fill and lock their Name and Phone to match HR records.
        </p>
        <select {...register('employee_id')}
          className="w-full rounded-xl border border-indigo-200 dark:border-indigo-800 bg-white dark:bg-zinc-900 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all">
          <option value="">-- No Employee Link (Create standalone user) --</option>
          {employees.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.first_name} {emp.last_name} {emp.employee_code ? `(${emp.employee_code})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Full Name {isLinked && <span className="text-xs font-normal text-amber-600 dark:text-amber-400 ml-1">(Locked by HR)</span>}
          </label>
          <input {...register('full_name')} placeholder="e.g. Dr. John Doe"
            disabled={isLinked}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all disabled:opacity-50 disabled:bg-zinc-50 dark:disabled:bg-zinc-900/50" />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
            Phone {isLinked && <span className="text-xs font-normal text-amber-600 dark:text-amber-400 ml-1">(Locked by HR)</span>}
          </label>
          <input {...register('phone')} placeholder="+92 300 1234567"
            disabled={isLinked}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all disabled:opacity-50 disabled:bg-zinc-50 dark:disabled:bg-zinc-900/50" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Username <span className="text-red-500">*</span></label>
        <input {...register('username')} placeholder="john_doe"
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all" />
        {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Email <span className="text-red-500">*</span></label>
        <input {...register('email')} type="email" placeholder="john@pharmacy.com"
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all" />
        {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Password <span className="text-red-500">*</span></label>
        <input {...register('password')} type="password" placeholder="Min 8 characters"
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all" />
        {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
      </div>

      <label className="flex items-center gap-3 cursor-pointer">
        <input {...register('force_password_change')} type="checkbox"
          className="rounded border-zinc-300 dark:border-zinc-600 text-indigo-600 focus:ring-indigo-500" />
        <span className="text-sm text-zinc-700 dark:text-zinc-300">Force password change on first login</span>
      </label>
    </div>
  );
}

function Step2({ register, errors, roles }: { register: any; errors: any; roles: any[] }) {
  return (
    <div className="space-y-5">
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Role & Access</h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">User Type</label>
          <select {...register('user_type')}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all">
            <option value="">Select type</option>
            {(Object.entries(USER_TYPE_LABELS) as [string, string][]).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Role</label>
          <select {...register('enterprise_role_id')}
            className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all">
            <option value="">No role assigned</option>
            {roles.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Max Concurrent Sessions</label>
        <input {...register('max_concurrent_sessions')} type="number" min="1" max="20" defaultValue={3}
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all" />
      </div>

      <div>
        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
          Allowed IPs <span className="text-zinc-400">(comma-separated, leave blank for any)</span>
        </label>
        <input {...register('allowed_ips')} placeholder="192.168.1.0, 10.0.0.0"
          className="w-full rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-4 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all" />
      </div>

      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-4 space-y-3">
        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Notification Preferences</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {(['notif_email', 'notif_sms', 'notif_push', 'notif_in_app'] as const).map((key) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input {...register(key)} type="checkbox" defaultChecked={key === 'notif_in_app'}
                className="rounded border-zinc-300 text-indigo-600 focus:ring-indigo-500" />
              <span className="text-sm text-zinc-600 dark:text-zinc-400 capitalize">
                {key.replace('notif_', '')}
              </span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

function Step3({ values, employees }: { values: FormValues; employees: any[] }) {
  const linkedEmployee = values.employee_id ? employees.find(e => e.id === values.employee_id) : null;
  const employeeLabel = linkedEmployee 
    ? `${linkedEmployee.first_name} ${linkedEmployee.last_name} (${linkedEmployee.employee_code || 'No Code'})`
    : 'None (Standalone User)';

  const rows = [
    { label: 'Linked Employee', value: employeeLabel },
    { label: 'Full Name', value: values.full_name },
    { label: 'Username', value: values.username },
    { label: 'Email', value: values.email },
    { label: 'User Type', value: values.user_type ? USER_TYPE_LABELS[values.user_type as keyof typeof USER_TYPE_LABELS] : '—' },
    { label: 'Max Sessions', value: values.max_concurrent_sessions },
    { label: 'Force PW Change', value: values.force_password_change ? 'Yes' : 'No' },
  ].filter((r) => r.value !== undefined && r.value !== '');

  return (
    <div className="space-y-5">
      <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Review & Confirm</h3>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        {rows.map((r, i) => (
          <div key={r.label} className={`flex items-center justify-between px-4 py-2.5 text-sm ${i % 2 === 0 ? 'bg-zinc-50 dark:bg-zinc-800/50' : 'bg-white dark:bg-zinc-900'}`}>
            <span className="text-zinc-500 dark:text-zinc-400">{r.label}</span>
            <span className="font-medium text-zinc-900 dark:text-zinc-100">{String(r.value)}</span>
          </div>
        ))}
      </div>
      <div className="flex items-start gap-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400">
        <span className="shrink-0 mt-0.5">⚠️</span>
        <span>The temporary password will be displayed once after creation. Make sure to share it securely with the user.</span>
      </div>
    </div>
  );
}

// ── Wizard ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

const STEPS = [
  { label: 'Identity',    icon: <User size={16} /> },
  { label: 'Role',        icon: <Shield size={16} /> },
  { label: 'Review',      icon: <ClipboardCheck size={16} /> },
];

export function CreateUserWizard({ open, onClose }: Props) {
  const [step, setStep] = useState(0);
  const [createdPassword, setCreatedPassword] = useState<string | null>(null);
  
  const { data: rolesData } = useEnterpriseRoles();
  const { data: allEmployees } = useEmployees();
  const createUser = useCreateUser();

  // Only show unlinked employees in the bridge combobox
  const unlinkedEmployees = useMemo(() => allEmployees?.filter(e => !e.user_id) ?? [], [allEmployees]);

  const methods = useForm<FormValues>({ resolver: zodResolver(schema) as any });
  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = methods;

  const onSubmit = async (values: FormValues) => {
    const payload: EnterpriseUserCreate = {
      username: values.username,
      email: values.email,
      password: values.password,
      full_name: values.full_name,
      phone: values.phone,
      user_type: values.user_type,
      enterprise_role_id: values.enterprise_role_id || undefined,
      employee_id: values.employee_id || undefined,
      force_password_change: values.force_password_change,
      max_concurrent_sessions: values.max_concurrent_sessions,
      allowed_ips: values.allowed_ips
        ? values.allowed_ips.split(',').map((s) => s.trim()).filter(Boolean)
        : undefined,
      notif_email:  values.notif_email,
      notif_sms:    values.notif_sms,
      notif_push:   values.notif_push,
      notif_in_app: values.notif_in_app,
    };
    try {
      await createUser.mutateAsync(payload);
      setCreatedPassword(values.password);
      toast.success('User created successfully!');
    } catch (err: any) {
      toast.error(err?.response?.data?.detail ?? 'Failed to create user');
    }
  };

  const next = () => setStep((s) => Math.min(s + 1, STEPS.length - 1));
  const prev = () => setStep((s) => Math.max(s - 1, 0));

  const handleDone = () => {
    setStep(0);
    setCreatedPassword(null);
    methods.reset();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 8 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Create User</h2>
            <p className="text-sm text-zinc-500">Step {step + 1} of {STEPS.length}</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-2 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 px-6 pt-5">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center gap-0 flex-1">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                i < step   ? 'bg-indigo-600 text-white' :
                i === step ? 'bg-indigo-600 text-white ring-4 ring-indigo-100 dark:ring-indigo-900' :
                             'bg-zinc-100 dark:bg-zinc-800 text-zinc-400'
              }`}>
                {i < step ? <CheckCircle2 size={14} /> : <span>{i + 1}</span>}
              </div>
              {i < STEPS.length - 1 && (
                <div className={`h-0.5 flex-1 transition-all ${i < step ? 'bg-indigo-600' : 'bg-zinc-200 dark:bg-zinc-700'}`} />
              )}
            </div>
          ))}
        </div>
        <div className="flex px-6 mt-1 mb-4">
          {STEPS.map((s, i) => (
            <div key={i} className="flex-1">
              <p className={`text-[10px] font-medium ${i === step ? 'text-indigo-600' : 'text-zinc-400'}`}>
                {s.label}
              </p>
            </div>
          ))}
        </div>

        {/* Content */}
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit as any)}>
            <div className="px-6 pb-4">
              <AnimatePresence mode="wait">
                {createdPassword ? (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="py-8 flex flex-col items-center gap-4 text-center"
                  >
                    <div className="h-16 w-16 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                      <CheckCircle2 size={32} className="text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100">User Created!</p>
                      <p className="text-sm text-zinc-500 mt-1">Share the temporary password securely:</p>
                    </div>
                    <div className="rounded-xl bg-zinc-100 dark:bg-zinc-800 px-6 py-3 font-mono text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-widest">
                      {createdPassword}
                    </div>
                    <button type="button" onClick={handleDone}
                      className="rounded-xl bg-indigo-600 px-8 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
                      Done
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.18 }}
                  >
                    {step === 0 && <Step1 register={register} errors={errors} setValue={setValue} watch={watch} employees={unlinkedEmployees} />}
                    {step === 1 && <Step2 register={register} errors={errors} roles={rolesData?.items ?? []} />}
                    {step === 2 && <Step3 values={watch()} employees={unlinkedEmployees} />}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Footer nav */}
            {!createdPassword && (
              <div className="flex items-center justify-between px-6 py-5 border-t border-zinc-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={prev}
                  disabled={step === 0}
                  className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
                >
                  <ChevronLeft size={16} /> Back
                </button>

                {step < STEPS.length - 1 ? (
                  <button
                    type="button"
                    onClick={next}
                    className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                  >
                    Next <ChevronRight size={16} />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                  >
                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    Create User
                  </button>
                )}
              </div>
            )}
          </form>
        </FormProvider>
      </motion.div>
    </div>
  );
}
