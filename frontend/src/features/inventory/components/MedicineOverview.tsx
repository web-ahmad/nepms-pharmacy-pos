import React from 'react';
import { Package, Tag, Layers, AlignLeft, Info, DollarSign, Activity } from 'lucide-react';

interface MedicineOverviewProps {
  medicine: any;
}

export default function MedicineOverview({ medicine }: MedicineOverviewProps) {
  if (!medicine) return null;

  const pkgLevels = medicine.packaging_levels || [];
  const stripLevel = pkgLevels.find((p: any) => p.level_name?.toLowerCase() === 'strip');
  const boxLevel = pkgLevels.find((p: any) => ['box', 'pack', 'carton'].includes(p.level_name?.toLowerCase() || ''));

  const unitsPerStrip = medicine.units_per_strip || stripLevel?.conversion_qty || 1;
  const stripsPerBox = medicine.strips_per_box || (boxLevel ? Math.floor(boxLevel.conversion_qty / unitsPerStrip) : 1);
  const packagingType = medicine.dosage_form || boxLevel?.level_name || 'Tablet / Capsule';

  const totalBaseUnits = boxLevel?.conversion_qty || 1;
  const purchasePrice = (medicine.cost_per_base_unit || 0) * totalBaseUnits;
  const fullPackSalePrice = boxLevel?.sale_price || medicine.sale_price || 0;

  const sections = [
    {
      title: "Basic Information",
      icon: Info,
      fields: [
        { label: "Formula / Composition", value: medicine.generic_name || "-" },
        { label: "Category", value: medicine.category || "-" },
        { label: "Manufacturer", value: medicine.manufacturer || "-" },
        { label: "Barcode", value: medicine.barcode || "-" },
        { label: "Status", value: medicine.is_active ? "Active" : "Inactive" },
      ]
    },
    {
      title: "Packaging & Units",
      icon: Package,
      fields: [
        { label: "Packaging Type", value: packagingType },
        { label: "Base Unit", value: medicine.base_unit || "-" },
        { label: "Strips per Box/Pack", value: stripsPerBox > 1 ? stripsPerBox : "-" },
        { label: "Units per Strip", value: unitsPerStrip > 1 ? unitsPerStrip : "-" },
        { label: "Strength", value: medicine.strength ? medicine.strength : "-" },
      ]
    },
    {
      title: "Pricing & Margins",
      icon: DollarSign,
      fields: [
        { label: "Purchase Price", value: `Rs ${purchasePrice.toFixed(2)}` },
        { label: "Full Pack Sale Price", value: `Rs ${fullPackSalePrice.toFixed(2)}` },
        { label: "Unit Retail Price", value: `Rs ${(medicine.unit_retail_price || 0).toFixed(2)}` },
        { label: "Maximum Retail Price (MRP)", value: `Rs ${(medicine.mrp || 0).toFixed(2)}` },
        { label: "Margin", value: `${medicine.margin_percent || 0}%` },
        { label: "Tax Rate", value: `${medicine.tax_rate || 0}%` },
      ]
    },
    {
      title: "Inventory Settings",
      icon: Layers,
      fields: [
        { label: "Shelf / Rack Location", value: medicine.shelf || "-" },
        { label: "Low Stock Alert Level", value: medicine.min_stock_level || "0" },
        { label: "Max Stock Level", value: medicine.max_stock_level || "0" },
        { label: "Current Stock", value: medicine.total_quantity || "0" },
      ]
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {sections.map((section, idx) => (
        <div key={idx} className="bg-slate-50 dark:bg-zinc-900/50 p-5 rounded-xl border border-slate-100 dark:border-zinc-800">
          <div className="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-zinc-800 pb-2">
            <section.icon className="w-5 h-5 text-blue-500" />
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">{section.title}</h3>
          </div>
          <div className="space-y-3">
            {section.fields.map((field, fIdx) => (
              <div key={fIdx} className="flex justify-between items-start gap-4">
                <span className="text-sm text-slate-500 dark:text-zinc-400">{field.label}</span>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100 text-right">{field.value}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
