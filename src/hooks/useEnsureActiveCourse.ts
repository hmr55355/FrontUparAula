import { useEffect, useRef } from 'react'

import { useActiveCourseStore } from '@/store/activeCourseStore'
import type { useActiveShift } from '@/hooks/useActiveShift'
import type { GroupSubject } from '@/types'

function snapshot(course: GroupSubject) {
  return {
    groupSubjectId: course.id,
    groupName: course.group?.name ?? '',
    subjectName: course.subject?.name ?? '',
    subjectColor: course.subject?.color ?? '#1565C0',
  }
}

/**
 * Mantiene el curso activo coherente con la jornada activa:
 * - Si el docente eligió un curso de otra jornada (desde "Mis cursos", el
 *   Dashboard…), la jornada lo sigue.
 * - Si cambió la jornada (a mano o porque cambió la hora) y el curso activo no
 *   es de ella, pasa al primer curso de la nueva jornada.
 * - Si ya no tiene acceso al curso guardado, toma el primero disponible.
 * También refresca el nombre guardado si el grupo o la materia se renombraron.
 * Todo en un solo efecto: dos efectos separados se pisaban en el mismo render.
 */
export function useEnsureActiveCourse(shift: ReturnType<typeof useActiveShift>) {
  const { activeCourse, setActiveCourse } = useActiveCourseStore()
  const { courses, coursesInShift, shiftOfCourse, activeShiftId, setShift } = shift
  const lastCourseId = useRef(activeCourse?.groupSubjectId)

  useEffect(() => {
    if (!courses || !coursesInShift || courses.length === 0) {
      return
    }

    const id = activeCourse?.groupSubjectId
    const courseChanged = id !== lastCourseId.current
    lastCourseId.current = id

    const current = id ? courses.find((c) => c.id === id) : undefined
    const courseShiftId = current ? shiftOfCourse.get(current.id) : undefined

    if (current && courseChanged && courseShiftId && activeShiftId !== null && courseShiftId !== activeShiftId) {
      setShift(courseShiftId)
      return
    }

    if (!current || !coursesInShift.some((c) => c.id === current.id)) {
      const fallback = coursesInShift[0] ?? courses[0]
      if (fallback.id !== id) {
        setActiveCourse(snapshot(fallback))
      }
      return
    }

    const fresh = snapshot(current)
    if (
      activeCourse &&
      (fresh.groupName !== activeCourse.groupName ||
        fresh.subjectName !== activeCourse.subjectName ||
        fresh.subjectColor !== activeCourse.subjectColor)
    ) {
      setActiveCourse(fresh)
    }
  }, [courses, coursesInShift, shiftOfCourse, activeShiftId, setShift, activeCourse, setActiveCourse])

  return activeCourse
}
