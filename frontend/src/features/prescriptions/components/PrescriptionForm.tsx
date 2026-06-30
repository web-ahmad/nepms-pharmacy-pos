'use client';

import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCustomers } from '@/features/crm/services/crm.api';
import { useCreatePrescription, useUpdatePrescription, useUploadPrescription } from '../services/prescription.api';
import { useMedicines } from '@/features/inventory/services/inventory.api';
import { Prescription, PrescriptionCreatePayload } from '../types/prescription';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, Trash2, Upload, XCircle, Check, ChevronsUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';

const prescriptionItemSchema = z.object({
  medicine_name: z.string().min(1, 'Medicine name is required'),
  medicine_id: z.string().optional(),
  dosage: z.string().optional(),
  frequency: z.string().optional(),
  duration: z.string().optional(),
  quantity: z.string().optional(),
  instructions: z.string().optional(),
});

const prescriptionSchema = z.object({
  patient_id: z.string().min(1, 'Patient is required'),
  doctor_name: z.string().min(1, 'Doctor name is required'),
  prescription_date: z.string().optional(),
  valid_until: z.string().optional(),
  diagnosis: z.string().optional(),
  notes: z.string().optional(),
  image_url: z.string().optional(),
  items: z.array(prescriptionItemSchema).min(1, 'At least one medicine is required'),
});

type PrescriptionFormValues = z.infer<typeof prescriptionSchema>;

interface PrescriptionFormProps {
  initialData?: Prescription;
}

export default function PrescriptionForm({ initialData }: PrescriptionFormProps) {
  const router = useRouter();
  const { data: customers } = useCustomers();
  const { data: medicinesData } = useMedicines('', 1, 1000);
  const medicines = medicinesData?.items || [];
  
  const createMutation = useCreatePrescription();
  const updateMutation = useUpdatePrescription(initialData?.id || '');
  const uploadMutation = useUploadPrescription();

  const [uploading, setUploading] = useState(false);
  const [patientOpen, setPatientOpen] = useState(false);

  const { register, control, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<PrescriptionFormValues>({
    resolver: zodResolver(prescriptionSchema),
    defaultValues: initialData ? {
      patient_id: initialData.patient_id,
      doctor_name: initialData.doctor_name || '',
      prescription_date: initialData.prescription_date ? format(new Date(initialData.prescription_date), 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      valid_until: initialData.valid_until ? format(new Date(initialData.valid_until), 'yyyy-MM-dd') : '',
      diagnosis: initialData.diagnosis || '',
      notes: initialData.notes || '',
      image_url: initialData.image_url || '',
      items: initialData.items.map(i => ({
        medicine_name: i.medicine_name,
        medicine_id: i.medicine_id || '',
        dosage: i.dosage || '',
        frequency: i.frequency || '',
        duration: i.duration || '',
        quantity: i.quantity || '',
        instructions: i.instructions || ''
      }))
    } : {
      patient_id: '',
      doctor_name: '',
      prescription_date: format(new Date(), 'yyyy-MM-dd'),
      valid_until: '',
      diagnosis: '',
      notes: '',
      image_url: '',
      items: [{ medicine_name: '', medicine_id: '', dosage: '', frequency: '', duration: '', quantity: '', instructions: '' }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items'
  });

  const imageUrl = watch('image_url');
  const patientId = watch('patient_id');
  const selectedPatient = customers?.find((c) => c.id === patientId);

  const onSubmit = async (data: PrescriptionFormValues) => {
    try {
      const payload: any = { ...data };
      
      // Clean up empty strings for date fields to prevent Pydantic validation errors
      if (!payload.valid_until) payload.valid_until = null;
      if (!payload.prescription_date) payload.prescription_date = null;
      
      if (initialData) {
        await updateMutation.mutateAsync(payload);
      } else {
        await createMutation.mutateAsync(payload);
      }
      router.push('/prescriptions');
    } catch (err) {
      console.error('VALIDATION_DETAILS:', JSON.stringify((err as any).response?.data?.detail, null, 2));
      console.error("AXIOS_ERROR_STATUS:", (err as any).response?.status);
      console.error("AXIOS_ERROR_DATA:", (err as any).response?.data);
      alert(`Failed to save prescription: ${((err as any).response?.data?.detail) || (err as any).message || 'Unknown error'}`);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await uploadMutation.mutateAsync(file);
      setValue('image_url', res.url);
    } catch (err) {
      console.error('Upload failed', err);
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">General Info</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Patient *</label>
                <Popover open={patientOpen} onOpenChange={setPatientOpen}>
                  <PopoverTrigger render={
                    <button
                      type="button"
                      role="combobox"
                      aria-expanded={patientOpen}
                      className={cn(
                        "w-full flex justify-between items-center rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
                        !patientId && "text-zinc-500"
                      )}
                    >
                      {selectedPatient 
                        ? `${selectedPatient.full_name} (${selectedPatient.phone || selectedPatient.cnic || 'No Contact'})` 
                        : "Select Patient..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </button>
                  } />
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput placeholder="Search patients..." />
                      <CommandList>
                        <CommandEmpty>No patient found.</CommandEmpty>
                        <CommandGroup>
                          {customers?.map((c) => (
                            <CommandItem
                              key={c.id}
                              value={`${c.full_name} ${c.phone} ${c.cnic}`}
                              onSelect={() => {
                                setValue("patient_id", c.id, { shouldValidate: true });
                                setPatientOpen(false);
                              }}
                            >
                              <Check className={cn("mr-2 h-4 w-4", patientId === c.id ? "opacity-100" : "opacity-0")} />
                              {c.full_name} ({c.phone || c.cnic || 'No Contact'})
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
                {errors.patient_id && <p className="mt-1 text-xs text-red-500">{errors.patient_id.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Doctor Name *</label>
                <input
                  type="text"
                  {...register('doctor_name')}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
                {errors.doctor_name && <p className="mt-1 text-xs text-red-500">{errors.doctor_name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Diagnosis</label>
                <input
                  type="text"
                  {...register('diagnosis')}
                  className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Prescription Date</label>
                  <input
                    type="date"
                    {...register('prescription_date')}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">Valid Until (Expiry)</label>
                  <input
                    type="date"
                    {...register('valid_until')}
                    className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4">Upload Scanned Copy</h3>
            <div className="flex items-center gap-4">
              {imageUrl ? (
                <div className="relative">
                  {imageUrl.endsWith('.pdf') ? (
                    <div className="w-24 h-24 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-700">
                      <span className="text-xs font-bold text-zinc-500">PDF</span>
                    </div>
                  ) : (
                    <img src={imageUrl} alt="Prescription" className="w-24 h-24 object-cover rounded-lg border border-zinc-200 dark:border-zinc-700" />
                  )}
                  <button type="button" onClick={() => setValue('image_url', '')} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"><XCircle size={14}/></button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg cursor-pointer bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-900">
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 mb-3 text-zinc-400" />
                    <p className="mb-2 text-sm text-zinc-500 dark:text-zinc-400"><span className="font-semibold">Click to upload</span> PDF, JPG, or PNG</p>
                  </div>
                  <input type="file" className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} disabled={uploading} />
                </label>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100">Prescribed Medicines</h3>
              <button
                type="button"
                onClick={() => append({ medicine_name: '', medicine_id: '', dosage: '', frequency: '', duration: '', quantity: '', instructions: '' })}
                className="text-sm flex items-center gap-1 text-blue-600 hover:text-blue-700"
              >
                <Plus size={16} /> Add Medicine
              </button>
            </div>
            
            {errors.items?.message && <p className="mb-4 text-xs text-red-500">{errors.items.message}</p>}

            <div className="space-y-4">
              {fields.map((field, index) => {
                const medicineId = watch(`items.${index}.medicine_id`);
                const medicineName = watch(`items.${index}.medicine_name`);
                const selectedMedicine = medicines.find((m: any) => m.id === medicineId) || medicines.find((m: any) => m.brand_name === medicineName);

                return (
                  <div key={field.id} className="p-4 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 relative">
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="absolute top-2 right-2 text-zinc-400 hover:text-red-500 z-10"
                    >
                      <Trash2 size={16} />
                    </button>
                    
                    <div className="space-y-3">
                      <div>
                        <MedicineCombobox 
                          index={index} 
                          medicineId={medicineId} 
                          medicineName={medicineName} 
                          selectedMedicine={selectedMedicine} 
                          medicines={medicines} 
                          setValue={setValue} 
                        />
                        {errors.items?.[index]?.medicine_name && <p className="mt-1 text-xs text-red-500">{errors.items[index]?.medicine_name?.message}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          placeholder="Dosage (e.g. 500mg)"
                          {...register(`items.${index}.dosage` as const)}
                          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                        <input
                          type="text"
                          placeholder="Frequency (e.g. 1-0-1)"
                          {...register(`items.${index}.frequency` as const)}
                          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                        <input
                          type="text"
                          placeholder="Duration (e.g. 5 days)"
                          {...register(`items.${index}.duration` as const)}
                          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                        <input
                          type="text"
                          placeholder="Qty (e.g. 10 tabs)"
                          {...register(`items.${index}.quantity` as const)}
                          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                        />
                      </div>
                      <input
                        type="text"
                        placeholder="Special Instructions"
                        {...register(`items.${index}.instructions` as const)}
                        className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 border-t border-zinc-200 dark:border-zinc-800 pt-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || uploading}
          className="flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-50"
        >
          {isSubmitting && <Loader2 size={16} className="animate-spin" />}
          {initialData ? 'Update Prescription' : 'Create Prescription'}
        </button>
      </div>
    </form>
  );
}

function MedicineCombobox({ index, medicineId, medicineName, selectedMedicine, medicines, setValue }: any) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full flex justify-between items-center rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
            !medicineName && "text-zinc-500"
          )}
        >
          {selectedMedicine ? selectedMedicine.brand_name : (medicineName || "Select Medicine...")}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      } />
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Search medicines..." />
          <CommandList>
            <CommandEmpty>No medicine found.</CommandEmpty>
            <CommandGroup>
              {medicines.map((m: any) => (
                <CommandItem
                  key={m.id}
                  value={`${m.brand_name} ${m.generic_name}`}
                  onSelect={() => {
                    setValue(`items.${index}.medicine_id`, m.id);
                    setValue(`items.${index}.medicine_name`, m.brand_name, { shouldValidate: true });
                    setOpen(false);
                  }}
                >
                  <Check className={cn("mr-2 h-4 w-4", medicineId === m.id ? "opacity-100" : "opacity-0")} />
                  {m.brand_name} <span className="text-xs text-zinc-500 ml-2">{m.generic_name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
