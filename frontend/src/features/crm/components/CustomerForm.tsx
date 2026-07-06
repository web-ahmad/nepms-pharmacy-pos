import { useEffect, useState } from 'react';
import { useCreateCustomer, useUpdateCustomer, useUpdateCustomerStatus } from '../services/crm.api';
import { notify } from '@/utils/toast';
import { Customer, CreateCustomerPayload } from '../types/crm';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Edit } from 'lucide-react';

const customerSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  phone: z.string().optional(),
  cnic: z.string().optional(),
  whatsapp: z.string().optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  dob: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  blood_group: z.string().optional(),
  medical_history: z.string().optional(),
  allergies: z.string().optional(),
  credit_limit: z.number().min(0, 'Credit limit cannot be negative'),
  is_active: z.boolean().optional(),
});

type CustomerFormValues = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  initialData?: Customer;
  onSuccess?: () => void;
  onCancel?: () => void;
  initialMode?: 'view' | 'edit';
}

export default function CustomerForm({ initialData, onSuccess, onCancel, initialMode = 'view' }: CustomerFormProps) {
  const router = useRouter();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer(initialData?.id || '');
  const updateStatusMutation = useUpdateCustomerStatus(initialData?.id || '');

  const [isEditMode, setIsEditMode] = useState(initialMode === 'edit' || !initialData);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      full_name: '',
      phone: '',
      cnic: '',
      whatsapp: '',
      email: '',
      dob: '',
      gender: 'Other',
      address: '',
      blood_group: '',
      medical_history: '',
      allergies: '',
      credit_limit: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (initialData) {
      reset({
        full_name: initialData.full_name,
        phone: initialData.phone || '',
        cnic: initialData.cnic || '',
        whatsapp: initialData.whatsapp || '',
        email: initialData.email || '',
        dob: initialData.dob || '',
        gender: initialData.gender || 'Other',
        address: initialData.address || '',
        blood_group: initialData.blood_group || '',
        medical_history: initialData.medical_history || '',
        allergies: initialData.allergies || '',
        credit_limit: initialData.credit_limit || 0,
        is_active: initialData.is_active !== false,
      });
    }
  }, [initialData, reset]);

  // Auto-Deactivation Logic Guarded
  useEffect(() => {
    if (
      initialData && 
      initialData.current_balance > initialData.credit_limit && 
      initialData.is_active !== false
    ) {
      updateStatusMutation.mutateAsync('inactive')
        .then(() => {
          notify.error('Credit limit breached, customer deactivated automatically.');
          setValue('is_active', false);
        })
        .catch((err) => {
          console.error('Failed to auto-deactivate customer', err);
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialData?.current_balance, initialData?.credit_limit, initialData?.is_active, initialData?.id]);

  const onSubmit = async (data: CustomerFormValues) => {
    try {
      if (initialData) {
        await updateMutation.mutateAsync(data as CreateCustomerPayload);
        setIsEditMode(false); // Switch back to view mode on save
      } else {
        const newCustomer = await createMutation.mutateAsync(data as CreateCustomerPayload);
        router.push(`/customers/${newCustomer.id}`);
      }
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Failed to save customer', err);
      notify.error('Failed to save customer details.');
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending || isSubmitting;

  const renderField = (label: string, value: string | number | undefined, type: 'text' | 'textarea' = 'text') => (
    <div>
      <label className="block text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{label}</label>
      <div className={`text-sm font-medium text-zinc-900 dark:text-zinc-100 ${type === 'textarea' ? 'whitespace-pre-wrap' : ''}`}>
        {value || '-'}
      </div>
    </div>
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basic Info */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-zinc-200 pb-2 dark:border-zinc-800">
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Basic Information</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Status</span>
                <button
                  type="button"
                  disabled={!isEditMode}
                  onClick={() => {
                    const current = watch('is_active');
                    const newStatus = !current;
                    setValue('is_active', newStatus, { shouldDirty: true });
                    
                    // Fire atomic sync to DB immediately
                    if (initialData?.id) {
                      updateStatusMutation.mutateAsync(newStatus ? 'active' : 'inactive')
                        .catch((err) => {
                           console.error(err);
                           // Revert if failed
                           setValue('is_active', current, { shouldDirty: true });
                           notify.error("Failed to update status");
                        });
                    }
                  }}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-70 ${
                    watch('is_active') ? 'bg-green-500' : 'bg-zinc-300 dark:bg-zinc-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      watch('is_active') ? 'translate-x-2' : '-translate-x-2'
                    }`}
                  />
                </button>
              </div>
              {!isEditMode && initialData && (
                <button
                  type="button"
                  onClick={() => setIsEditMode(true)}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  <Edit size={16} /> Edit Profile
                </button>
              )}
            </div>
          </div>
          
          {!isEditMode ? (
            renderField('Full Name', watch('full_name'))
          ) : (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Full Name *</label>
              <input
                type="text"
                {...register('full_name')}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              {errors.full_name && <p className="mt-1 text-xs text-red-500">{errors.full_name.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {!isEditMode ? (
              renderField('Phone', watch('phone'))
            ) : (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Phone</label>
                <input
                  type="text"
                  {...register('phone')}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
            )}
            {!isEditMode ? (
              renderField('WhatsApp', watch('whatsapp'))
            ) : (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">WhatsApp</label>
                <input
                  type="text"
                  {...register('whatsapp')}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {!isEditMode ? (
              renderField('CNIC', watch('cnic'))
            ) : (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">CNIC</label>
                <input
                  type="text"
                  {...register('cnic')}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
            )}
            {!isEditMode ? (
              renderField('Email', watch('email'))
            ) : (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Email</label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {!isEditMode ? (
              renderField('Date of Birth', watch('dob'))
            ) : (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Date of Birth</label>
                <input
                  type="date"
                  {...register('dob')}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>
            )}
            {!isEditMode ? (
              renderField('Gender', watch('gender'))
            ) : (
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Gender</label>
                <select
                  {...register('gender')}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            )}
          </div>

          {!isEditMode ? (
            renderField('Address', watch('address'), 'textarea')
          ) : (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Address</label>
              <textarea
                rows={2}
                {...register('address')}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          )}
        </div>

        {/* Medical & Credit */}
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 border-b border-zinc-200 pb-2 dark:border-zinc-800">Medical & Credit</h3>
          
          {!isEditMode ? (
            renderField('Blood Group', watch('blood_group'))
          ) : (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Blood Group</label>
              <select
                {...register('blood_group')}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              >
                <option value="">Select...</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
              </select>
            </div>
          )}

          {!isEditMode ? (
            renderField('Allergies', watch('allergies'), 'textarea')
          ) : (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Allergies</label>
              <textarea
                rows={2}
                {...register('allergies')}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          )}

          {!isEditMode ? (
            renderField('Medical History / Notes', watch('medical_history'), 'textarea')
          ) : (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Medical History / Notes</label>
              <textarea
                rows={3}
                {...register('medical_history')}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>
          )}

          {!isEditMode ? (
            renderField('Credit Limit ($)', watch('credit_limit'))
          ) : (
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Credit Limit ($)</label>
              <input
                type="number"
                step="0.01"
                {...register('credit_limit', { valueAsNumber: true })}
                className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              />
              {errors.credit_limit && <p className="mt-1 text-xs text-red-500">{errors.credit_limit.message}</p>}
            </div>
          )}
        </div>
      </div>

      {isEditMode && (
        <div className="flex justify-end gap-3 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <button
            type="button"
            onClick={() => {
              if (onCancel) onCancel();
              else if (initialData) {
                // If no external onCancel, reset to initialData and toggle back to view mode
                reset({
                  full_name: initialData.full_name,
                  phone: initialData.phone || '',
                  cnic: initialData.cnic || '',
                  whatsapp: initialData.whatsapp || '',
                  email: initialData.email || '',
                  dob: initialData.dob || '',
                  gender: initialData.gender || 'Other',
                  address: initialData.address || '',
                  blood_group: initialData.blood_group || '',
                  medical_history: initialData.medical_history || '',
                  allergies: initialData.allergies || '',
                  credit_limit: initialData.credit_limit || 0,
                  is_active: initialData.is_active !== false,
                } as CustomerFormValues);
                setIsEditMode(false);
              }
              else router.back();
            }}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
          >
            {isPending ? 'Saving...' : initialData ? 'Update Customer' : 'Create Customer'}
          </button>
        </div>
      )}
    </form>
  );
}
