import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { InstitutionRole } from '@/types'

interface ViewModeState {
  viewMode: InstitutionRole
  setViewMode: (mode: InstitutionRole) => void
}

export const useViewModeStore = create<ViewModeState>()(
  persist(
    (set) => ({
      viewMode: 'admin',
      setViewMode: (mode) => set({ viewMode: mode }),
    }),
    { name: 'uparaula-view-mode' }
  )
)
