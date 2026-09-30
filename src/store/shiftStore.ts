import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { localDateString } from '@/utils/dateHelpers'

/**
 * Jornada elegida a mano por el docente. Guarda la jornada automática de ese
 * momento y el día: la elección vale mientras la automática no cambie y solo ese
 * día. En cuanto la automática cambia, useActiveShift la borra (si no, revivía
 * horas después cuando la automática volvía a ser la misma).
 */
interface ShiftState {
  manual: { shiftId: number; autoShiftId: number | null; day: string } | null
  chooseShift: (shiftId: number, autoShiftId: number | null) => void
  clearManualShift: () => void
}

export const useShiftStore = create<ShiftState>()(
  persist(
    (set) => ({
      manual: null,
      chooseShift: (shiftId, autoShiftId) => set({ manual: { shiftId, autoShiftId, day: localDateString() } }),
      clearManualShift: () => set({ manual: null }),
    }),
    { name: 'uparaula-active-shift' }
  )
)
