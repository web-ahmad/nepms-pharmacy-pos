import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface MedicineFormSettingsState {
  showGenericName: boolean;
  showBrandName: boolean;
  showBarcode: boolean;
  showShelfLocation: boolean;
  showMargin: boolean;
  showStrength: boolean;
  showFormula: boolean;
  showMRP: boolean;
  showTaxRate: boolean;
  showMinStock: boolean;
  showMaxStock: boolean;
  showOpeningStock: boolean;
  showBatchDetails: boolean;
  showStatus: boolean;
  showControlledSubstance: boolean;

  toggleField: (field: keyof Omit<MedicineFormSettingsState, 'toggleField' | 'resetToDefaults'>) => void;
  resetToDefaults: () => void;
}

const defaultSettings = {
  showGenericName: true,
  showBrandName: true,
  showBarcode: true,
  showShelfLocation: true,
  showMargin: true,
  showStrength: true,
  showFormula: true,
  showMRP: true,
  showTaxRate: true,
  showMinStock: true,
  showMaxStock: true,
  showOpeningStock: true,
  showBatchDetails: true,
  showStatus: true,
  showControlledSubstance: true,
};

export const useMedicineFormSettings = create<MedicineFormSettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,
      toggleField: (field) => set((state) => ({ [field]: !state[field] })),
      resetToDefaults: () => set(defaultSettings),
    }),
    {
      name: 'medicine-form-settings',
    }
  )
);
