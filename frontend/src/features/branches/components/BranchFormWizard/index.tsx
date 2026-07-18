'use client';
// features/branches/components/BranchFormWizard/index.tsx
// 7-step wizard for creating a new branch.
// Steps: Basic Info → Contact → Address → Manager → Business Settings → Security → Review

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, FormProvider, type UseFormRegister, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Info, Phone, MapPin, User, Settings, ShieldCheck, ClipboardList,
  ChevronLeft, ChevronRight, Loader2, CheckCircle2,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { WizardStepper, type WizardStep } from './WizardStepper';
import { useCreateBranch } from '../../services/branch.api';
import type { BranchCreate } from '../../types/branch';

// ── Zod validation schema ─────────────────────────────────────────────────────

const branchSchema = z.object({
  // Step 1: Basic
  name:    z.string().min(2, 'Name is required'),
  code:    z.string().min(1, 'Branch code is required'),
  type:    z.string().min(1),
  status:  z.string().min(1),
  theme_color: z.string().optional(),
  notes:   z.string().optional(),

  // Step 2: Contact
  email:           z.string().email().optional().or(z.literal('')),
  phone:           z.string().optional(),
  alternate_phone: z.string().optional(),

  // Step 3: Address
  country:     z.string().optional(),
  province:    z.string().optional(),
  region:      z.string().optional(),
  city:        z.string().optional(),
  address:     z.string().optional(),
  postal_code: z.string().optional(),
  latitude:    z.coerce.number().optional(),
  longitude:   z.coerce.number().optional(),

  // Step 4: Manager
  manager_name:       z.string().optional(),
  manager_email:      z.string().email().optional().or(z.literal('')),
  manager_phone:      z.string().optional(),
  manager_user_id:    z.string().optional(),
  pharmacist_user_id: z.string().optional(),

  // Step 5: Business settings
  opening_date:        z.string().optional(),
  timezone:            z.string().optional(),
  currency:            z.string().optional(),
  drug_license_number: z.string().optional(),
  drug_license_expiry: z.string().optional(),
  tax_number:          z.string().optional(),
  invoice_prefix:      z.string().optional(),
  receipt_footer:      z.string().optional(),
});

type FormData = z.infer<typeof branchSchema>;

// ── Step definitions ──────────────────────────────────────────────────────────

const STEPS: WizardStep[] = [
  { id: 0, label: 'Basic Information',    description: 'Name, type, status',       icon: Info },
  { id: 1, label: 'Contact Information',  description: 'Email, phone',              icon: Phone },
  { id: 2, label: 'Address',              description: 'Location & coordinates',    icon: MapPin },
  { id: 3, label: 'Manager Assignment',   description: 'Staff & pharmacist',        icon: User },
  { id: 4, label: 'Business Settings',    description: 'License, timezone, prefix', icon: Settings },
  { id: 5, label: 'Security Settings',    description: 'Access & device policies',  icon: ShieldCheck },
  { id: 6, label: 'Review & Submit',      description: 'Confirm all details',       icon: ClipboardList },
];

// ── Field wrapper ─────────────────────────────────────────────────────────────

function Field({
  label, required, error, children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

const inputClass =
  'w-full px-3 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition';

const selectClass =
  'w-full px-3 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition';

// ── Step components ───────────────────────────────────────────────────────────

function StepBasicInfo({ register, errors }: { register: UseFormRegister<FormData>; errors: Record<string, { message?: string }> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <Field label="Branch Name" required error={errors.name?.message}>
          <input {...register('name')} placeholder="e.g. Islamabad Main Branch" className={inputClass} />
        </Field>
      </div>
      <Field label="Branch Code" required error={errors.code?.message}>
        <input {...register('code')} placeholder="e.g. BR-ISB-001" className={inputClass} />
      </Field>
      <Field label="Branch Type">
        <select {...register('type')} className={selectClass}>
          <option value="retail_branch">Retail Branch</option>
          <option value="head_office">Head Office</option>
          <option value="main_branch">Main Branch</option>
          <option value="warehouse">Warehouse</option>
          <option value="distribution_center">Distribution Center</option>
          <option value="franchise_branch">Franchise Branch</option>
          <option value="online_branch">Online Branch</option>
          <option value="temporary_branch">Temporary Branch</option>
        </select>
      </Field>
      <Field label="Status">
        <select {...register('status')} className={selectClass}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="under_construction">Under Construction</option>
          <option value="suspended">Suspended</option>
          <option value="closed">Closed</option>
          <option value="maintenance">Maintenance</option>
        </select>
      </Field>
      <Field label="Theme Color">
        <div className="flex items-center gap-3">
          <input {...register('theme_color')} type="color" defaultValue="#6366f1"
            className="w-12 h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer p-1" />
          <input {...register('theme_color')} placeholder="#6366f1" className={`${inputClass} flex-1`} />
        </div>
      </Field>
      <div className="sm:col-span-2">
        <Field label="Notes">
          <textarea {...register('notes')} rows={3} placeholder="Internal notes about this branch…"
            className={`${inputClass} resize-none`} />
        </Field>
      </div>
    </div>
  );
}

function StepContact({ register, errors }: { register: UseFormRegister<FormData>; errors: Record<string, { message?: string }> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <Field label="Email Address" error={errors.email?.message}>
          <input {...register('email')} type="email" placeholder="branch@pharmacy.com" className={inputClass} />
        </Field>
      </div>
      <Field label="Primary Phone">
        <input {...register('phone')} placeholder="+92-51-1234567" className={inputClass} />
      </Field>
      <Field label="Alternate Phone">
        <input {...register('alternate_phone')} placeholder="+92-300-1234567" className={inputClass} />
      </Field>
    </div>
  );
}

function StepAddress({ register }: { register: UseFormRegister<FormData> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Country">
        <input {...register('country')} placeholder="Pakistan" className={inputClass} />
      </Field>
      <Field label="Province">
        <input {...register('province')} placeholder="Punjab" className={inputClass} />
      </Field>
      <Field label="Region">
        <input {...register('region')} placeholder="North" className={inputClass} />
      </Field>
      <Field label="City">
        <input {...register('city')} placeholder="Islamabad" className={inputClass} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Full Address">
          <textarea {...register('address')} rows={2} placeholder="Plot 12-C, Commercial Area…"
            className={`${inputClass} resize-none`} />
        </Field>
      </div>
      <Field label="Postal Code">
        <input {...register('postal_code')} placeholder="44000" className={inputClass} />
      </Field>
      <div className="sm:col-span-2 grid grid-cols-2 gap-4">
        <Field label="Latitude">
          <input {...register('latitude')} type="number" step="any" placeholder="33.6844" className={inputClass} />
        </Field>
        <Field label="Longitude">
          <input {...register('longitude')} type="number" step="any" placeholder="73.0479" className={inputClass} />
        </Field>
      </div>
    </div>
  );
}

function StepManager({ register, errors }: { register: UseFormRegister<FormData>; errors: Record<string, { message?: string }> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <Field label="Manager Name">
          <input {...register('manager_name')} placeholder="Ahmad Khan" className={inputClass} />
        </Field>
      </div>
      <Field label="Manager Email" error={errors.manager_email?.message}>
        <input {...register('manager_email')} type="email" placeholder="manager@pharmacy.com" className={inputClass} />
      </Field>
      <Field label="Manager Phone">
        <input {...register('manager_phone')} placeholder="+92-300-1234567" className={inputClass} />
      </Field>
      <Field label="Manager User ID">
        <input {...register('manager_user_id')} placeholder="UUID of the user account" className={inputClass} />
      </Field>
      <Field label="Pharmacist In Charge (User ID)">
        <input {...register('pharmacist_user_id')} placeholder="UUID of pharmacist user" className={inputClass} />
      </Field>
    </div>
  );
}

function StepBusiness({ register }: { register: UseFormRegister<FormData> }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <Field label="Opening Date">
        <input {...register('opening_date')} type="date" className={inputClass} />
      </Field>
      <Field label="Timezone">
        <select {...register('timezone')} className={selectClass}>
          <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
          <option value="Asia/Dubai">Asia/Dubai (GST)</option>
          <option value="UTC">UTC</option>
        </select>
      </Field>
      <Field label="Currency">
        <select {...register('currency')} className={selectClass}>
          <option value="PKR">PKR — Pakistani Rupee</option>
          <option value="USD">USD — US Dollar</option>
          <option value="AED">AED — UAE Dirham</option>
        </select>
      </Field>
      <Field label="Drug License Number">
        <input {...register('drug_license_number')} placeholder="368-/NT/9/2025" className={inputClass} />
      </Field>
      <Field label="Drug License Expiry">
        <input {...register('drug_license_expiry')} type="date" className={inputClass} />
      </Field>
      <Field label="Tax / NTN Number">
        <input {...register('tax_number')} placeholder="NTN or GST number" className={inputClass} />
      </Field>
      <Field label="Invoice Prefix">
        <input {...register('invoice_prefix')} placeholder="INV-ISB-" className={inputClass} />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Receipt Footer">
          <textarea {...register('receipt_footer')} rows={2} placeholder="Thank you for your visit!"
            className={`${inputClass} resize-none`} />
        </Field>
      </div>
    </div>
  );
}

function StepSecurity() {
  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/10 p-4">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">Security Settings</p>
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
          Advanced IP whitelisting, GPS verification, and device policies can be configured after
          the branch is created from the branch settings page.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 opacity-60 pointer-events-none">
        {['IP Whitelist', 'Device Restrictions', 'GPS Verification Radius', 'Allowed Login Locations'].map((label) => (
          <div key={label} className="rounded-xl border border-zinc-200 dark:border-zinc-700 p-3 bg-zinc-50 dark:bg-zinc-800">
            <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
            <p className="text-sm text-zinc-400 mt-1">Configure after creation</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function StepReview({ values }: { values: Partial<FormData> }) {
  const rows: [string, string][] = [
    ['Branch Name',   values.name || '—'],
    ['Code',          values.code || '—'],
    ['Type',          values.type || '—'],
    ['Status',        values.status || '—'],
    ['City',          values.city || '—'],
    ['Province',      values.province || '—'],
    ['Phone',         values.phone || '—'],
    ['Email',         values.email || '—'],
    ['Manager',       values.manager_name || '—'],
    ['License #',     values.drug_license_number || '—'],
    ['Currency',      values.currency || 'PKR'],
    ['Timezone',      values.timezone || 'Asia/Karachi'],
  ];

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700 overflow-hidden">
        <div className="bg-zinc-50 dark:bg-zinc-800 px-4 py-2.5 text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide">
          Review Branch Details
        </div>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-zinc-500 dark:text-zinc-400">{label}</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100 text-right max-w-xs truncate">{value}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 p-3 rounded-xl bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800">
        <CheckCircle2 size={16} className="text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
        <p className="text-sm text-indigo-700 dark:text-indigo-400">
          Review the details above and click <strong>Create Branch</strong> to save.
        </p>
      </div>
    </div>
  );
}

// ── Main Wizard Component ─────────────────────────────────────────────────────

export function BranchFormWizard() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const { mutate: createBranch, isPending } = useCreateBranch();

  const methods = useForm<FormData>({
    resolver: zodResolver(branchSchema) as any,
    defaultValues: {
      type:     'retail_branch',
      status:   'active',
      currency: 'PKR',
      timezone: 'Asia/Karachi',
      country:  'Pakistan',
      theme_color: '#6366f1',
    },
  });

  const { register, handleSubmit, watch, formState: { errors }, trigger } = methods;
  const values = watch();

  const STEP_FIELDS: (keyof FormData)[][] = [
    ['name', 'code', 'type', 'status', 'theme_color', 'notes'],
    ['email', 'phone', 'alternate_phone'],
    ['country', 'province', 'region', 'city', 'address', 'postal_code', 'latitude', 'longitude'],
    ['manager_name', 'manager_email', 'manager_phone', 'manager_user_id', 'pharmacist_user_id'],
    ['opening_date', 'timezone', 'currency', 'drug_license_number', 'drug_license_expiry', 'tax_number', 'invoice_prefix', 'receipt_footer'],
    [],
    [],
  ];

  const handleNext = async () => {
    const fieldsToValidate = STEP_FIELDS[currentStep];
    if (fieldsToValidate && fieldsToValidate.length > 0) {
      const isValid = await trigger(fieldsToValidate);
      if (!isValid) {
        toast.error('Please fill all required fields correctly before proceeding.');
        return;
      }
    }
    setCurrentStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const onSubmit: SubmitHandler<FormData> = (data) => {
    const payload: BranchCreate = {
      ...data,
      latitude:  data.latitude  || undefined,
      longitude: data.longitude || undefined,
    } as BranchCreate;

    createBranch(payload, {
      onSuccess: (created) => {
        toast.success(`Branch "${created.name}" created successfully!`);
        router.push(`/branches/${created.id}`);
      },
      onError: (err: unknown) => {
        let msg = 'Failed to create branch.';
        const data = (err as any)?.response?.data;
        if (data) {
          if (typeof data.detail === 'string') msg = data.detail;
          else if (Array.isArray(data.detail)) msg = `${data.detail[0]?.loc?.join('.')}: ${data.detail[0]?.msg}`;
          else if (data.message) msg = data.message;
        }
        toast.error(msg);
      },
    });
  }

  const stepContents = [
    <StepBasicInfo key={0}  register={register} errors={errors as Record<string, { message?: string }>} />,
    <StepContact   key={1}  register={register} errors={errors as Record<string, { message?: string }>} />,
    <StepAddress   key={2}  register={register} />,
    <StepManager   key={3}  register={register} errors={errors as Record<string, { message?: string }>} />,
    <StepBusiness  key={4}  register={register} />,
    <StepSecurity  key={5}  />,
    <StepReview    key={6}  values={values} />,
  ];

  return (
    <FormProvider {...methods}>
      <div className="flex gap-8 min-h-[600px]">
        {/* Left: stepper */}
        <div className="hidden lg:block w-56 flex-shrink-0 pt-1">
          <WizardStepper steps={STEPS} currentStep={currentStep} />
        </div>

        {/* Right: form */}
        <div className="flex-1 flex flex-col">
          {/* Step header */}
          <div className="mb-6">
            <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 uppercase tracking-wide mb-1">
              Step {currentStep + 1} of {STEPS.length}
            </p>
            <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {STEPS[currentStep].label}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {STEPS[currentStep].description}
            </p>
          </div>

          {/* Step content with slide animation */}
          <div className="flex-1 overflow-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.2 }}
              >
                {stepContents[currentStep]}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 mt-6 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="button"
              onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
              disabled={currentStep === 0}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft size={16} /> Previous
            </button>

            {/* Mobile step indicator */}
            <div className="flex gap-1.5 lg:hidden">
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition ${
                    i === currentStep ? 'bg-indigo-600 w-4' : i < currentStep ? 'bg-indigo-300' : 'bg-zinc-200 dark:bg-zinc-700'
                  }`}
                />
              ))}
            </div>

            {currentStep < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition"
              >
                Next <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit(onSubmit as any)}
                disabled={isPending}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {isPending ? (
                  <><Loader2 size={16} className="animate-spin" /> Creating…</>
                ) : (
                  <><CheckCircle2 size={16} /> Create Branch</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </FormProvider>
  );
}
