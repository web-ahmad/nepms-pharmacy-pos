'use client';

import React from 'react';
import { Settings2Icon, RotateCcwIcon } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useMedicineFormSettings } from '../../store/useMedicineFormSettings';

export default function MedicineFormSettingsModal() {
  const settings = useMedicineFormSettings();

  const groups = [
    {
      title: 'Basic Information',
      items: [
        { id: 'showGenericName', label: 'Generic Name' },
        { id: 'showBrandName', label: 'Brand Name' },
        { id: 'showBarcode', label: 'Barcode / EAN' },
      ],
    },
    {
      title: 'Location & Pricing',
      items: [
        { id: 'showShelfLocation', label: 'Shelf / Rack Location' },
        { id: 'showMargin', label: 'Margin (%)' },
        { id: 'showMRP', label: 'Max Retail Price (MRP)' },
        { id: 'showTaxRate', label: 'Tax Rate (%)' },
      ],
    },
    {
      title: 'Specifications & Inventory',
      items: [
        { id: 'showStrength', label: 'Strength / Specification' },
        { id: 'showFormula', label: 'Formula / Composition' },
        { id: 'showMinStock', label: 'Min Stock Level' },
        { id: 'showMaxStock', label: 'Max Stock Level' },
      ],
    },
    {
      title: 'Stock Details',
      items: [
        { id: 'showOpeningStock', label: 'Opening Stock' },
        { id: 'showBatchDetails', label: 'Batch Details (Mfg, Expiry)' },
      ],
    },
    {
      title: 'Status & Control',
      items: [
        { id: 'showStatus', label: 'Active Status' },
        { id: 'showControlledSubstance', label: 'Controlled Substance' },
      ],
    },
  ];

  return (
    <Dialog>
      <DialogTrigger render={<button className="inline-flex cursor-pointer items-center justify-center whitespace-nowrap text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground h-8 rounded-md px-3 gap-2 shrink-0" />}>
        <Settings2Icon className="w-4 h-4" />
        Form Settings
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Form Layout Settings</DialogTitle>
          <DialogDescription>
            Customize which fields appear when adding a new medicine. These settings are saved automatically on this device.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {groups.map((group) => (
            <div key={group.title} className="space-y-3">
              <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">{group.title}</h4>
              <div className="space-y-3">
                {group.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between py-1">
                    <Label htmlFor={item.id} className="cursor-pointer flex-1">
                      {item.label}
                    </Label>
                    <Switch
                      id={item.id}
                      checked={settings[item.id as keyof typeof settings] as boolean}
                      onCheckedChange={() => settings.toggleField(item.id as any)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <Button variant="ghost" size="sm" onClick={settings.resetToDefaults} className="text-zinc-500 gap-2">
            <RotateCcwIcon className="w-4 h-4" />
            Reset to Defaults
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
