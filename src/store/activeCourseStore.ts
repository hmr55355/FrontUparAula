import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import type { ActiveCourse } from '@/types'

interface ActiveCourseState {
  activeCourse: ActiveCourse | null
  setActiveCourse: (course: ActiveCourse) => void
  clearActiveCourse: () => void
}

export const useActiveCourseStore = create<ActiveCourseState>()(
  persist(
    (set) => ({
      activeCourse: null,
      setActiveCourse: (course) => set({ activeCourse: course }),
      clearActiveCourse: () => set({ activeCourse: null }),
    }),
    { name: 'uparaula-active-course' }
  )
)
