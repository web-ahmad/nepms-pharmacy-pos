import React from 'react';
import { useFormContext } from 'react-hook-form';
import { MedicineFormValues } from '../schema';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Beaker, FlaskConical, Syringe, Tablets } from 'lucide-react';

const dosageForms = [
  'Tablet', 'Capsule', 'Syrup', 'Suspension', 'Drops', 
  'Injection', 'Ampoule', 'Vial', 'Tube', 'Cream', 
  'Gel', 'Ointment', 'Powder', 'Sachet', 'Inhaler', 
  'Spray', 'Lotion', 'Patch', 'Device', 'Other'
];

export default function Step2Dosage() {
  const { register, watch, setValue, formState: { errors } } = useFormContext<MedicineFormValues>();
  
  const selectedForm = watch('dosage_form');

  const getFormIcon = () => {
    switch (selectedForm) {
      case 'Tablet':
      case 'Capsule': return <Tablets className="w-5 h-5 text-indigo-500" />;
      case 'Syrup':
      case 'Suspension': return <FlaskConical className="w-5 h-5 text-indigo-500" />;
      case 'Injection':
      case 'Ampoule':
      case 'Vial': return <Syringe className="w-5 h-5 text-indigo-500" />;
      default: return <Beaker className="w-5 h-5 text-indigo-500" />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="border-b dark:border-zinc-800 pb-4">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
          {getFormIcon()}
          Dosage Form & Specifics
        </h2>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
          Select the dosage form to reveal specific configuration fields.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="dosage_form" className="text-zinc-700 dark:text-zinc-300">Dosage Form *</Label>
          <Select onValueChange={(val: any) => {
            setValue('dosage_form', val, { shouldValidate: true });
            // Reset base_unit based on selection
            if (val === 'Tablet' || val === 'Capsule') setValue('base_unit', 'Tablet');
            else if (val === 'Syrup' || val === 'Suspension') setValue('base_unit', 'Bottle');
            else if (val === 'Tube' || val === 'Cream' || val === 'Ointment') setValue('base_unit', 'Tube');
            else if (val === 'Injection' || val === 'Vial' || val === 'Ampoule') setValue('base_unit', 'Vial');
            else setValue('base_unit', 'Piece');
          }} value={selectedForm || ""}>
            <SelectTrigger className={`w-full bg-zinc-50 dark:bg-zinc-900/50 ${errors.dosage_form ? 'border-red-500' : ''}`}>
              <SelectValue placeholder="Select Dosage Form" />
            </SelectTrigger>
            <SelectContent className="max-h-[300px]">
              {dosageForms.map(form => (
                <SelectItem key={form} value={form}>{form}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.dosage_form && <p className="text-xs text-red-500">{errors.dosage_form.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="base_unit" className="text-zinc-700 dark:text-zinc-300">Base Tracking Unit *</Label>
          <Input id="base_unit" {...register('base_unit')} className="bg-zinc-100 dark:bg-zinc-800/50" readOnly />
          <p className="text-xs text-zinc-500">Auto-assigned based on dosage form.</p>
        </div>
      </div>

      {/* Dynamic Fields Section */}
      {selectedForm && (
        <div className="p-6 bg-slate-50 dark:bg-zinc-900/30 rounded-xl border border-slate-200 dark:border-zinc-800 mt-6">
          <h3 className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-4 flex items-center gap-2">
            Specifics for {selectedForm}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(selectedForm === 'Tablet' || selectedForm === 'Capsule') && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Tablets per Strip</Label>
                  <Input type="number" placeholder="10" className="bg-white dark:bg-zinc-900" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Strips per Box</Label>
                  <Input type="number" placeholder="10" className="bg-white dark:bg-zinc-900" />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Boxes per Carton</Label>
                  <Input type="number" placeholder="20" className="bg-white dark:bg-zinc-900" />
                </div>
              </>
            )}

            {(selectedForm === 'Syrup' || selectedForm === 'Suspension' || selectedForm === 'Lotion') && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Bottle Size / Volume</Label>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="120" className="bg-white dark:bg-zinc-900" />
                    <Select defaultValue="ml">
                      <SelectTrigger className="w-20 bg-white dark:bg-zinc-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ml">ml</SelectItem>
                        <SelectItem value="L">L</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {(selectedForm === 'Tube' || selectedForm === 'Cream' || selectedForm === 'Ointment' || selectedForm === 'Gel') && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Weight</Label>
                  <div className="flex gap-2">
                    <Input type="number" placeholder="15" className="bg-white dark:bg-zinc-900" />
                    <Select defaultValue="g">
                      <SelectTrigger className="w-20 bg-white dark:bg-zinc-900">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="g">g</SelectItem>
                        <SelectItem value="mg">mg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </>
            )}

            {(selectedForm === 'Injection' || selectedForm === 'Ampoule' || selectedForm === 'Vial') && (
              <>
                <div className="space-y-2">
                  <Label className="text-xs">Dose Type</Label>
                  <Select defaultValue="single">
                    <SelectTrigger className="bg-white dark:bg-zinc-900">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="single">Single Dose</SelectItem>
                      <SelectItem value="multi">Multi Dose</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
          </div>
          <p className="text-xs text-zinc-500 mt-4 italic">Note: These values will be used to automatically configure packaging conversions in the next step.</p>
        </div>
      )}
    </div>
  );
}
