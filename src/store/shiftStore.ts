import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Jornada elegida a mano por el docente. Guarda también cuál era la jornada
 * automática en ese momento: cuando la automática cambia (otro día u otra hora),
 * la elección manual deja de aplicar y se vuelve a la del horario.
 */
interface ShiftState {
  manual: { shiftId: number; autoShiftId: number | null } | null
  chooseShift: (shiftId: number, autoShiftId: number | null) => void
  clearManualShift: () => void
}

export const useShiftStore = create<ShiftState>()(
  persist(
    (set) => ({
      manual: null,
      chooseShift: (shiftId, autoShiftId) => set({ manual: { shiftId, autoShiftId } }),
      clearManualShift: () => set({ manual: null }),
    }),
    { name: 'uparaula-active-shift' }
  )
)
