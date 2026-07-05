import React from 'react';
import { useFormContext } from 'react-hook-form';
import { MedicineFormValues } from '../schema';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dna, Pill, Factory, FileText, Globe } from 'lucide-react';
import { Controller } from 'react-hook-form';
import { CreatableMasterDataSelect } from '../../CreatableMasterDataSelect';

export default function Step1BasicInfo() {
  const { register, watch, setValue, control, formState: { errors } } = useFormContext<MedicineFormValues>();
  
  const status = watch('status');
  
  // Example of auto-generating a SKU or Slug based on the name
  const name = watch('name');
  
  const generateSlug = () => {
    if (name) {
      setValue('slug', name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''), { shouldValidate: true, shouldDirty: true });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-b dark:border-zinc-800 pb-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          <Pill className="w-5 h-5 text-indigo-500" />
          Basic Information
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Enter the core identity details of the medicine.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="space-y-2 col-span-1 md:col-span-2">
          <Label htmlFor="name" className="text-zinc-700 dark:text-zinc-300">Medicine Name *</Label>
          <Input 
            id="name"
            {...register('name')}
            onBlur={generateSlug}
            placeholder="e.g. Panadol Extra 500mg" 
            className={`bg-zinc-50 dark:bg-zinc-900/50 ${errors.name ? 'border-red-500' : ''}`}
          />
          {errors.name && <p className="text-xs text-red-500">{errors.name.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <div className="flex items-center space-x-2 pt-2">
            <Switch
              id="status"
              checked={status === 'Active'}
              onCheckedChange={(checked) => setValue('status', checked ? 'Active' : 'Inactive')}
            />
            <Label htmlFor="status" className="font-normal cursor-pointer">
              {status === 'Active' ? <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-none">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
            </Label>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="brand_name" className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
            Brand Name
          </Label>
          <Controller
            control={control}
            name="brand_name"
            render={({ field }) => (
              <CreatableMasterDataSelect
                masterType="brands"
                value={field.value || ''}
                onChange={field.onChange}
                placeholder="e.g. Panadol"
                error={!!errors.brand_name}
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="generic_name" className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
            <Dna className="w-4 h-4 text-zinc-400" />
            Generic Name
          </Label>
          <Controller
            control={control}
            name="generic_name"
            render={({ field }) => (
              <CreatableMasterDataSelect
                masterType="generics"
                value={field.value || ''}
                onChange={field.onChange}
                placeholder="e.g. Paracetamol"
                error={!!errors.generic_name}
              />
            )}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="manufacturer" className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
            <Factory className="w-4 h-4 text-zinc-400" />
            Manufacturer *
          </Label>
          <Controller
            control={control}
            name="manufacturer"
            render={({ field }) => (
              <CreatableMasterDataSelect
                masterType="manufacturers"
                value={field.value || ''}
                onChange={field.onChange}
                placeholder="e.g. GSK"
                error={!!errors.manufacturer}
              />
            )}
          />
          {errors.manufacturer && <p className="text-xs text-red-500">{String(errors.manufacturer.message)}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="country_of_origin" className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
            <Globe className="w-4 h-4 text-zinc-400" />
            Country of Origin
          </Label>
          <Input id="country_of_origin" {...register('country_of_origin')} placeholder="e.g. UK" className="bg-zinc-50 dark:bg-zinc-900/50" />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="strength">Strength</Label>
          <div className="flex gap-2">
            <Input id="strength" {...register('strength')} placeholder="500" className="bg-zinc-50 dark:bg-zinc-900/50" />
            <Select onValueChange={(val: any) => setValue('strength_unit', val)} value={watch('strength_unit') || ""}>
              <SelectTrigger className="w-24 bg-zinc-50 dark:bg-zinc-900/50">
                <SelectValue placeholder="Unit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mg">mg</SelectItem>
                <SelectItem value="mcg">mcg</SelectItem>
                <SelectItem value="g">g</SelectItem>
                <SelectItem value="ml">ml</SelectItem>
                <SelectItem value="IU">IU</SelectItem>
                <SelectItem value="%">%</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t dark:border-zinc-800">
        <div className="space-y-2">
          <Label htmlFor="description" className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300">
            <FileText className="w-4 h-4 text-zinc-400" />
            Description
          </Label>
          <Textarea id="description" {...register('description')} rows={3} placeholder="Brief description of the medicine..." className="bg-zinc-50 dark:bg-zinc-900/50 resize-none" />
        </div>
        
        <div className="space-y-4">
          <div className="p-4 bg-slate-50 dark:bg-zinc-900/30 rounded-lg border border-slate-200 dark:border-zinc-800">
            <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-3">Auto-Generated Fields</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Internal Code</Label>
                <Input {...register('internal_product_code')} disabled className="h-8 text-xs bg-slate-100 dark:bg-zinc-900" placeholder="Auto-generated" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-slate-500">Slug</Label>
                <Input {...register('slug')} disabled className="h-8 text-xs bg-slate-100 dark:bg-zinc-900" placeholder="Auto-generated" />
              </div>
              <div className="space-y-1 col-span-2">
                <Label className="text-xs text-slate-500">Search Keywords</Label>
                <Input {...register('search_keywords')} disabled className="h-8 text-xs bg-slate-100 dark:bg-zinc-900" placeholder="Auto-generated based on name & generic" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
