// features/users/store/user-store.ts
// Zustand store for Enterprise Users & Identity Management module state.

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserListParams } from '../types/user';

export type UserViewMode = 'table' | 'card';

interface UserStoreState {
  // List state
  viewMode: UserViewMode;
  params: UserListParams;
  selectedIds: string[];

  // Actions
  setViewMode: (mode: UserViewMode) => void;
  setParams: (params: Partial<UserListParams>) => void;
  resetParams: () => void;
  toggleSelected: (id: string) => void;
  setSelected: (ids: string[]) => void;
  clearSelected: () => void;
}

const DEFAULT_PARAMS: UserListParams = {
  search:    '',
  status:    '',
  user_type: '',
  role_id:   '',
  branch_id: '',
  sort_by:   'created_at',
  sort_dir:  'desc',
  page:      1,
  limit:     20,
};

export const useUserStore = create<UserStoreState>()(
  persist(
    (set, get) => ({
      viewMode:    'table',
      params:      DEFAULT_PARAMS,
      selectedIds: [],

      setViewMode: (mode) => set({ viewMode: mode }),

      setParams: (updates) =>
        set((state) => ({
          params: { ...state.params, ...updates, page: updates.page ?? 1 },
        })),

      resetParams: () => set({ params: DEFAULT_PARAMS, selectedIds: [] }),

      toggleSelected: (id) =>
        set((state) => ({
          selectedIds: state.selectedIds.includes(id)
            ? state.selectedIds.filter((x) => x !== id)
            : [...state.selectedIds, id],
        })),

      setSelected: (ids) => set({ selectedIds: ids }),
      clearSelected: () => set({ selectedIds: [] }),
    }),
    {
      name: 'nepms-user-store',
      partialize: (state) => ({
        viewMode: state.viewMode,
        params:   state.params,
      }),
    }
  )
);
