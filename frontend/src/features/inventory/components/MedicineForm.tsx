import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Barcode } from 'lucide-react';
import { Medicine } from '../types/inventory';
import { useMedicines } from '../services/inventory.api';

interface MedicineFormProps {
  initialData?: Medicine;
  isEditMode?: boolean;
}

export default function MedicineForm({ initialData: medicine }: MedicineFormProps) {
  const { data: medicinesData } = useMedicines();

  if (!medicine) return null;

  const isSingleUnitUOM = ['Tube', 'Bottle', 'Vial', 'Sachet'].includes(medicine.uom || '');
  const totalUnitsPerPack = (medicine.strips_per_box || 1) * (medicine.units_per_strip || 1);

  const substituteIds = (medicine as any).substitute_ids || [];
  const selectedSubstitutes = medicinesData?.items?.filter((m: any) => substituteIds.includes(m.id)) || [];

  return (
    <div className="space-y-8">
      {/* Section 1: Basic Information */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">1. Basic Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Barcode</label>
            <div className="mt-1 font-medium text-slate-900 flex items-center">
              <Barcode className="h-4 w-4 text-slate-400 mr-2" />
              {medicine.barcode || '-'}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Product Name</label>
            <div className="mt-1 font-medium text-slate-900 capitalize">{medicine.name || '-'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Generic Name</label>
            <div className="mt-1 font-medium text-slate-900">{medicine.generic_name || '-'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Brand Name / Manufacturer</label>
            <div className="mt-1 font-medium text-slate-900">{medicine.brand_name || medicine.manufacturer || '-'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Product Category</label>
            <div className="mt-1 font-medium text-slate-900">{medicine.category || '-'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Therapeutic Class</label>
            <div className="mt-1 font-medium text-slate-900">{medicine.therapeutic_class || '-'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">SKU / Product Code</label>
            <div className="mt-1 font-medium text-slate-900">{medicine.sku || '-'}</div>
          </div>
        </div>
      </div>

      {/* Section 2: Packaging & Unit Details */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">2. Packaging & Unit Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Pack Size</label>
            <div className="mt-1 font-medium text-slate-900">{medicine.packaging_unit || '-'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Unit of Measure</label>
            <div className="mt-1 font-medium text-slate-900">{medicine.uom || '-'}</div>
          </div>

          {!isSingleUnitUOM ? (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Strips per Box</label>
                <div className="mt-1 font-medium text-slate-900">{medicine.strips_per_box || 1}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-500 mb-1">Units per Strip</label>
                <div className="mt-1 font-medium text-slate-900">{medicine.units_per_strip || 1}</div>
              </div>
            </>
          ) : (
            <div className="md:col-span-1 flex items-center pt-6">
              <p className="text-sm text-slate-400 italic">Strip configuration disabled for {medicine.uom}.</p>
            </div>
          )}
          
          <div className="md:col-span-3 flex items-end mt-2">
            <div className="w-full bg-slate-50 p-3 rounded-md border border-slate-200 flex justify-between items-center">
              <span className="text-sm font-medium text-slate-500">{isSingleUnitUOM ? 'Units/Volume per Pack:' : 'Total Units per Pack (Calculated):'}</span>
              <span className="text-lg font-bold text-indigo-600">{totalUnitsPerPack} Units</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 3: Pricing */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">3. Pricing</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Purchase Price</label>
            <div className="mt-1 font-medium text-slate-900">Rs {(medicine.purchase_price || 0).toFixed(2)}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Retail Price (MRP)</label>
            <div className="mt-1 font-medium text-slate-900">Rs {(medicine.sale_price || 0).toFixed(2)}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Trade Price</label>
            <div className="mt-1 font-medium text-slate-900">Rs {(medicine.trade_price || 0).toFixed(2)}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Discount %</label>
            <div className="mt-1 font-medium text-slate-900">{medicine.discount_percentage || 0}%</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Tax Category</label>
            <div className="mt-1 font-medium text-slate-900">{medicine.tax_category || 'Exempt'}</div>
          </div>
        </div>
      </div>

      {/* Section 4: Stock Thresholds */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">4. Stock Thresholds</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Current Stock Qty</label>
            <div className="mt-1 font-medium text-slate-900">{medicine.total_quantity || 0}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Minimum Stock Level</label>
            <div className="mt-1 font-medium text-slate-900">{medicine.min_stock_level || 0}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Reorder Level</label>
            <div className="mt-1 font-medium text-slate-900">{medicine.reorder_level || 0}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Storage Location / Shelf</label>
            <div className="mt-1 font-medium text-slate-900">{medicine.shelf || '-'}</div>
          </div>
        </div>
      </div>

      {/* Section 5: Regulatory & Safety */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">5. Regulatory & Safety</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Drug Schedule</label>
            <div className="mt-1 font-medium text-slate-900">{medicine.drug_schedule || '-'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Storage Conditions</label>
            <div className="mt-1 font-medium text-slate-900">{medicine.storage_conditions || '-'}</div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Controlled Substance Flag</label>
            <div className="mt-1 font-medium text-slate-900">
              {medicine.is_controlled ? (
                <span className="text-red-600 font-semibold bg-red-50 px-2 py-1 rounded">Yes - Controlled</span>
              ) : (
                <span className="text-slate-600">No</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section 6: Additional */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900 mb-4 border-b pb-2">6. Additional</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Status</label>
            <div className="mt-1 font-medium text-slate-900 flex items-center">
              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                medicine.status === 'Active' || medicine.is_active
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-slate-100 text-slate-800'
              }`}>
                {medicine.status || (medicine.is_active ? 'Active' : 'Inactive')}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-500 mb-1">Substitute Medicines</label>
            <div className="mt-1 flex flex-wrap gap-2">
              {selectedSubstitutes.length === 0 ? (
                <span className="text-slate-400 italic">No substitutes configured.</span>
              ) : (
                selectedSubstitutes.map((med: any) => (
                  <Badge key={med.id} variant="secondary" className="bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {med.name}
                  </Badge>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
