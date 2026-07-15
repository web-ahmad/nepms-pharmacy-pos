// features/branches/store/branch-store.ts
// Zustand slice for local branch management UI state.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { BranchListParams, BranchStatus, BranchType, BranchViewMode } from '../types/branch';

interface BranchFilters {
  search: string;
  status: BranchStatus | '';
  type: BranchType | '';
  region: string;
  city: string;
  sort_by: string;
  sort_dir: 'asc' | 'desc';
  page: number;
  limit: number;
}

interface BranchState {
  // List UI
  viewMode: BranchViewMode;
  filters: BranchFilters;

  // Selected branches for comparison
  comparisonIds: string[];

  // Wizard state (step tracking)
  wizardStep: number;
  wizardData: Partial<Record<string, unknown>>;

  // Actions
  setViewMode: (mode: BranchViewMode) => void;
  setFilter: (key: keyof BranchFilters, value: string | number) => void;
  resetFilters: () => void;
  setPage: (page: number) => void;
  toggleComparison: (id: string) => void;
  clearComparison: () => void;
  setWizardStep: (step: number) => void;
  setWizardData: (data: Record<string, unknown>) => void;
  resetWizard: () => void;
}

const DEFAULT_FILTERS: BranchFilters = {
  search:   '',
  status:   '',
  type:     '',
  region:   '',
  city:     '',
  sort_by:  'name',
  sort_dir: 'asc',
  page:     1,
  limit:    20,
};

export const useBranchStore = create<BranchState>()(
  persist(
    (set) => ({
      viewMode:     'table',
      filters:      DEFAULT_FILTERS,
      comparisonIds: [],
      wizardStep:   0,
      wizardData:   {},

      setViewMode: (mode) => set({ viewMode: mode }),

      setFilter: (key, value) =>
        set((state) => ({
          filters: {
            ...state.filters,
            [key]: value,
            // Reset to page 1 on filter change (except page itself)
            page: key === 'page' ? (value as number) : 1,
          },
        })),

      resetFilters: () => set({ filters: DEFAULT_FILTERS }),

      setPage: (page) =>
        set((state) => ({ filters: { ...state.filters, page } })),

      toggleComparison: (id) =>
        set((state) => {
          const exists = state.comparisonIds.includes(id);
          if (exists) {
            return { comparisonIds: state.comparisonIds.filter((i) => i !== id) };
          }
          if (state.comparisonIds.length >= 6) return state;  // max 6
          return { comparisonIds: [...state.comparisonIds, id] };
        }),

      clearComparison: () => set({ comparisonIds: [] }),

      setWizardStep: (step) => set({ wizardStep: step }),

      setWizardData: (data) =>
        set((state) => ({ wizardData: { ...state.wizardData, ...data } })),

      resetWizard: () => set({ wizardStep: 0, wizardData: {} }),
    }),
    {
      name: 'nepms-branch-ui',
      partialize: (state) => ({
        viewMode: state.viewMode,
        filters:  state.filters,
      }),
    }
  )
);

// Selector: convert store filters → API params
export function selectApiParams(filters: BranchFilters): BranchListParams {
  return {
    ...(filters.search   && { search:   filters.search }),
    ...(filters.status   && { status:   filters.status as BranchStatus }),
    ...(filters.type     && { type:     filters.type as BranchType }),
    ...(filters.region   && { region:   filters.region }),
    ...(filters.city     && { city:     filters.city }),
    sort_by:  filters.sort_by  || 'name',
    sort_dir: filters.sort_dir || 'asc',
    page:     filters.page     || 1,
    limit:    filters.limit    || 20,
  };
}
