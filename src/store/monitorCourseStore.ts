import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/** Curso en el que está trabajando el monitor (si es monitor de más de uno). */
interface MonitorCourseState {
  courseMonitorId: number | null
  setCourseMonitorId: (id: number) => void
}

export const useMonitorCourseStore = create<MonitorCourseState>()(
  persist(
    (set) => ({
      courseMonitorId: null,
      setCourseMonitorId: (id) => set({ courseMonitorId: id }),
    }),
    { name: 'uparaula-monitor-course' }
  )
)
