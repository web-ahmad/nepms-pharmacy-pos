'use client';
// app/(dashboard)/branches/[id]/edit/page.tsx — Edit Branch Page

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { motion } from 'framer-motion';
import { ChevronLeft, Loader2, Save, CheckCircle2 } from 'lucide-react';
import { useBranch, useUpdateBranch } from '@/features/branches/services/branch.api';
import { BranchStatusBadge } from '@/features/branches/components/BranchStatusBadge';
import toast from 'react-hot-toast';
import type { BranchUpdate } from '@/features/branches/types/branch';

const inputClass = 'w-full px-3 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition';
const selectClass = 'w-full px-3 py-2.5 text-sm rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition';

function Field({ label, children, error }: { label: string; children: React.ReactNode; error?: string }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

export default function EditBranchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { data: branch, isLoading: branchLoading } = useBranch(id);
  const { mutate: updateBranch, isPending } = useUpdateBranch(id);

  const { register, handleSubmit, formState: { errors, isDirty } } = useForm<BranchUpdate>({
    values: branch ? {
      name:    branch.name,
      code:    branch.code,
      type:    branch.type,
      status:  branch.status,
      email:   branch.email,
      phone:   branch.phone,
      alternate_phone:     branch.alternate_phone,
      country:             branch.country,
      province:            branch.province,
      region:              branch.region,
      city:                branch.city,
      address:             branch.address,
      postal_code:         branch.postal_code,
      manager_name:        branch.manager_name,
      manager_email:       branch.manager_email,
      manager_phone:       branch.manager_phone,
      drug_license_number: branch.drug_license_number,
      drug_license_expiry: branch.drug_license_expiry as string | undefined,
      tax_number:          branch.tax_number,
      opening_date:        branch.opening_date as string | undefined,
      timezone:            branch.timezone,
      currency:            branch.currency,
      notes:               branch.notes,
      theme_color:         branch.theme_color,
      invoice_prefix:      branch.invoice_prefix,
      receipt_footer:      branch.receipt_footer,
    } : undefined,
  });

  function onSubmit(data: BranchUpdate) {
    updateBranch(data, {
      onSuccess: () => {
        toast.success('Branch updated successfully!');
        router.push(`/branches/${id}`);
      },
      onError: () => {
        toast.error('Failed to update branch. Please try again.');
      },
    });
  }

  if (branchLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={32} className="animate-spin text-indigo-600" />
      </div>
    );
  }

  if (!branch) {
    return <p className="text-sm text-zinc-500 p-8 text-center">Branch not found.</p>;
  }

  const sections = [
    {
      title: 'Basic Information',
      fields: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Branch Name">
              <input {...register('name')} className={inputClass} />
            </Field>
          </div>
          <Field label="Branch Code">
            <input {...register('code')} className={inputClass} />
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
              <input {...register('theme_color')} type="color"
                className="w-12 h-10 rounded-lg border border-zinc-200 dark:border-zinc-700 cursor-pointer p-1" />
              <input {...register('theme_color')} placeholder="#6366f1" className={`${inputClass} flex-1`} />
            </div>
          </Field>
        </div>
      ),
    },
    {
      title: 'Contact Information',
      fields: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Email">
              <input {...register('email')} type="email" className={inputClass} />
            </Field>
          </div>
          <Field label="Primary Phone">
            <input {...register('phone')} className={inputClass} />
          </Field>
          <Field label="Alternate Phone">
            <input {...register('alternate_phone')} className={inputClass} />
          </Field>
        </div>
      ),
    },
    {
      title: 'Address',
      fields: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Country"><input {...register('country')} className={inputClass} /></Field>
          <Field label="Province"><input {...register('province')} className={inputClass} /></Field>
          <Field label="Region"><input {...register('region')} className={inputClass} /></Field>
          <Field label="City"><input {...register('city')} className={inputClass} /></Field>
          <div className="sm:col-span-2">
            <Field label="Address">
              <textarea {...register('address')} rows={2} className={`${inputClass} resize-none`} />
            </Field>
          </div>
          <Field label="Postal Code"><input {...register('postal_code')} className={inputClass} /></Field>
        </div>
      ),
    },
    {
      title: 'Manager',
      fields: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Manager Name"><input {...register('manager_name')} className={inputClass} /></Field>
          </div>
          <Field label="Manager Email"><input {...register('manager_email')} type="email" className={inputClass} /></Field>
          <Field label="Manager Phone"><input {...register('manager_phone')} className={inputClass} /></Field>
        </div>
      ),
    },
    {
      title: 'Business Settings',
      fields: (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Drug License #"><input {...register('drug_license_number')} className={inputClass} /></Field>
          <Field label="License Expiry"><input {...register('drug_license_expiry')} type="date" className={inputClass} /></Field>
          <Field label="Tax / NTN Number"><input {...register('tax_number')} className={inputClass} /></Field>
          <Field label="Invoice Prefix"><input {...register('invoice_prefix')} className={inputClass} /></Field>
          <Field label="Currency">
            <select {...register('currency')} className={selectClass}>
              <option value="PKR">PKR</option>
              <option value="USD">USD</option>
              <option value="AED">AED</option>
            </select>
          </Field>
          <Field label="Timezone">
            <select {...register('timezone')} className={selectClass}>
              <option value="Asia/Karachi">Asia/Karachi (PKT)</option>
              <option value="Asia/Dubai">Asia/Dubai (GST)</option>
              <option value="UTC">UTC</option>
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Receipt Footer">
              <textarea {...register('receipt_footer')} rows={2} className={`${inputClass} resize-none`} />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Notes">
              <textarea {...register('notes')} rows={3} className={`${inputClass} resize-none`} />
            </Field>
          </div>
        </div>
      ),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-6 max-w-4xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/branches/${id}`)}
            className="p-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition"
          >
            <ChevronLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Edit Branch</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-zinc-500 font-mono">{branch.code}</p>
              <BranchStatusBadge status={branch.status} size="sm" animate={false} />
            </div>
          </div>
        </div>
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={isPending || !isDirty}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isPending
            ? <><Loader2 size={14} className="animate-spin" /> Saving…</>
            : <><Save size={14} /> Save Changes</>
          }
        </button>
      </div>

      {/* Sections */}
      {sections.map((section) => (
        <div
          key={section.title}
          className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/50">
            <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">{section.title}</h2>
          </div>
          <div className="p-6">{section.fields}</div>
        </div>
      ))}

      {/* Save button at bottom */}
      <div className="flex justify-end">
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={isPending || !isDirty}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          {isPending
            ? <><Loader2 size={16} className="animate-spin" /> Saving…</>
            : <><CheckCircle2 size={16} /> Save All Changes</>
          }
        </button>
      </div>
    </motion.div>
  );
}
