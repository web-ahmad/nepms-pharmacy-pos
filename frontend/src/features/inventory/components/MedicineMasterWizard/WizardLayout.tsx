'use client';

import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Save, X, ChevronRight, ChevronLeft, CheckCircle2 } from 'lucide-react';
import { useCreateMedicine } from '@/features/inventory/services/medicine.api';

import { medicineSchema, MedicineFormValues, defaultMedicineValues } from './schema';
import Step1BasicInfo from './steps/Step1BasicInfo';
import Step2Dosage from './steps/Step2Dosage';
import Step3Packaging from './steps/Step3Packaging';
import Step4Pricing from './steps/Step4Pricing';
import Step5InventoryAndSupplier from './steps/Step5InventoryAndSupplier';
import Step6InitialBatch from './steps/Step6InitialBatch';
import Step7TaxesAndRestrictions from './steps/Step7TaxesAndRestrictions';

const STEPS = [
  { id: 'basic', title: 'Basic Info', component: Step1BasicInfo, fields: ['name', 'status', 'brand_name', 'generic_name', 'manufacturer', 'country_of_origin', 'strength', 'strength_unit', 'description'] },
  { id: 'dosage', title: 'Dosage', component: Step2Dosage, fields: ['dosage_form', 'category_id', 'therapeutic_class', 'sub_category'] },
  { id: 'packaging', title: 'Packaging', component: Step3Packaging, fields: ['base_unit', 'packaging_levels'] },
  { id: 'pricing', title: 'Pricing', component: Step4Pricing, fields: ['purchase_price', 'purchase_discount_percent', 'extra_charges', 'tax_rate', 'margin_percent', 'wholesale_margin_percent', 'sale_price', 'mrp'] },
  { id: 'inventory', title: 'Inventory', component: Step5InventoryAndSupplier, fields: ['preferred_supplier', 'supplier_product_code', 'supplier_barcode', 'supplier_purchase_price', 'lead_time', 'minimum_order_quantity', 'min_stock_level', 'max_stock_level', 'reorder_level', 'shelf', 'rack', 'warehouse', 'expiry_alert_days'] },
  { id: 'batch', title: 'Initial Batch', component: Step6InitialBatch, fields: ['initial_batch'] },
  { id: 'taxes', title: 'Taxes & Rules', component: Step7TaxesAndRestrictions, fields: ['tax_type', 'tax_inclusive', 'hs_code', 'is_otc', 'is_antibiotic', 'is_controlled', 'narcotic', 'cold_chain', 'age_restriction', 'temp_condition', 'protect_from_light', 'keep_dry', 'hazardous'] },
];

export default function WizardLayout() {
  const router = useRouter();
  const createMedicineMutation = useCreateMedicine();
  const [currentStep, setCurrentStep] = useState(0);

  const methods = useForm<MedicineFormValues>({
    resolver: zodResolver(medicineSchema) as any,
    defaultValues: defaultMedicineValues,
    mode: 'onChange'
  });

  const { handleSubmit, trigger, formState: { errors, isValid } } = methods;

  const handleNext = async () => {
    const fieldsToValidate = STEPS[currentStep].fields as any;
    const isStepValid = await trigger(fieldsToValidate);
    if (isStepValid) {
      setCurrentStep(prev => Math.min(prev + 1, STEPS.length - 1));
    } else {
      toast.error('Please fix the errors in this step before proceeding.');
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const onSubmit = async (data: MedicineFormValues) => {
    // Only submit if on the last step
    if (currentStep !== STEPS.length - 1) {
      return handleNext();
    }
    
    try {
      // 1. Calculate base units to find unit cost
      let calcTotalBaseUnits = 1;
      let isTablet = false;
      if (data.packaging_type === 'Tablet / Capsule') {
         isTablet = true;
         calcTotalBaseUnits = (data.strips_per_box || 1) * (data.units_per_strip || 1);
      } else {
         calcTotalBaseUnits = (data.strips_per_box || 1);
      }

      const costPerBaseUnit = data.purchase_price > 0 ? (data.purchase_price / calcTotalBaseUnits) : 0;
      
      // 2. Build packaging levels
      const packagingLevels = [];
      if (isTablet) {
        packagingLevels.push({
           level_name: 'Tablet',
           conversion_qty: 1,
           is_smallest_unit: true,
           is_sale_unit: true,
           is_purchase_unit: false,
           is_default_pos_unit: true,
           sale_price: data.unit_sale_price || 0
        });
        packagingLevels.push({
           level_name: 'Strip',
           conversion_qty: data.units_per_strip || 10,
           is_smallest_unit: false,
           is_sale_unit: true,
           is_purchase_unit: false,
           is_default_pos_unit: false,
           sale_price: 0
        });
        packagingLevels.push({
           level_name: 'Box',
           conversion_qty: calcTotalBaseUnits,
           is_smallest_unit: false,
           is_sale_unit: true,
           is_purchase_unit: true,
           is_default_pos_unit: false,
           sale_price: data.sale_price || 0
        });
      } else {
        const smallestUnitName = data.packaging_type === 'Syrup / Suspension' ? 'Bottle' : 
                       data.packaging_type === 'Injection (Ampule / Vial)' ? 'Ampule' : 
                       data.packaging_type === 'Drops (Eye / Ear / Nasal)' ? 'Drop' : 
                       data.packaging_type === 'Cream / Ointment / Gel' ? 'Tube' : 
                       data.packaging_type === 'Inhaler / Spray' ? 'Inhaler' : 
                       data.packaging_type === 'Sachet / Powder' ? 'Sachet' : 'Unit';
        
        packagingLevels.push({
           level_name: smallestUnitName,
           conversion_qty: 1,
           is_smallest_unit: true,
           is_sale_unit: true,
           is_purchase_unit: false,
           is_default_pos_unit: true,
           sale_price: data.unit_sale_price || 0
        });
        packagingLevels.push({
           level_name: 'Box',
           conversion_qty: calcTotalBaseUnits,
           is_smallest_unit: false,
           is_sale_unit: true,
           is_purchase_unit: true,
           is_default_pos_unit: false,
           sale_price: data.sale_price || 0
        });
      }

      const payload = {
        ...data,
        dosage_form: data.packaging_type,
        cost_per_base_unit: costPerBaseUnit,
        packaging_levels: packagingLevels,
        initial_batch: data.opening_stock > 0 ? {
           batch_number: data.batch_number,
           manufacturing_date: data.manufacturing_date,
           expiry_date: data.expiry_date,
           current_stock: data.opening_stock,
           mrp: data.mrp
        } : undefined
      };

      await createMedicineMutation.mutateAsync(payload as any);
      toast.success("Medicine created successfully.");
      router.push('/inventory/medicines');
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      let errorMsg: string;
      if (Array.isArray(detail)) {
        errorMsg = detail.map((d: any) => (typeof d === 'object' ? d.msg || JSON.stringify(d) : String(d))).join(', ');
      } else if (typeof detail === 'string') {
        errorMsg = detail;
      } else {
        errorMsg = error.message || 'Failed to create medicine';
      }
      toast.error(errorMsg);
      console.log('Submit Error:', error);
    }
  };

  const onError = (errors: any) => {
    toast.error("Please fill in all required fields correctly.");
    console.log("Form Validation Errors:", errors);
  };

  const CurrentStepComponent = STEPS[currentStep].component;

  return (
    <div className="w-full max-w-5xl mx-auto pb-8">
      {/* Stepper Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-200 dark:bg-zinc-800 rounded-full z-0"></div>
          <div 
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 rounded-full z-0 transition-all duration-300" 
            style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
          ></div>
          
          {STEPS.map((step, index) => {
            const isCompleted = index < currentStep;
            const isCurrent = index === currentStep;
            
            return (
              <div key={step.id} className="relative z-10 flex flex-col items-center gap-2">
                <div 
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm transition-colors border-2
                    ${isCompleted ? 'bg-indigo-600 border-indigo-600 text-white' : 
                      isCurrent ? 'bg-white dark:bg-zinc-900 border-indigo-600 text-indigo-600' : 
                      'bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-slate-400'}`}
                >
                  {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : (index + 1)}
                </div>
                <span className={`text-xs font-medium hidden md:block absolute -bottom-6 w-max text-center
                  ${isCurrent ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-6 mt-12">
          
          <div className="bg-white dark:bg-zinc-900 rounded-xl border border-slate-200 dark:border-zinc-800 shadow-sm overflow-hidden min-h-[400px] flex flex-col">
            <div className="flex-1 p-6 md:p-8">
              <CurrentStepComponent />
            </div>

            {/* Bottom Action Bar */}
            <div className="p-6 bg-slate-50 dark:bg-zinc-900/50 border-t border-slate-200 dark:border-zinc-800 flex justify-between items-center">
              <div>
                <Button 
                  type="button" 
                  variant="ghost" 
                  onClick={() => router.push('/inventory/medicines')}
                  className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                >
                  Cancel
                </Button>
              </div>
              <div className="flex gap-3">
                {currentStep > 0 && (
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handlePrevious}
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                )}
                
                {currentStep < STEPS.length - 1 ? (
                  <Button 
                    type="button" 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    onClick={handleNext}
                  >
                    Next Step
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    type="submit" 
                    className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[150px]"
                    disabled={createMedicineMutation.isPending}
                  >
                    {createMedicineMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Complete & Save
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>

        </form>
      </FormProvider>
    </div>
  );
}
