import { useQuery } from '@tanstack/react-query'

import { groupSubjectsApi } from '@/services/api/groupSubjects'
import { useActiveCourseStore } from '@/store/activeCourseStore'

/**
 * Resolves the full GroupSubject (with its group_id, academic_year_id, etc.) for
 * whatever course is currently active, since the Zustand store only keeps the
 * lightweight display fields.
 */
export function useActiveCourseGroup() {
  const { activeCourse } = useActiveCourseStore()

  const { data: courses, isLoading } = useQuery({
    queryKey: ['group-subjects', 'mine'],
    queryFn: groupSubjectsApi.myCourses,
  })

  const course = courses?.find((c) => c.id === activeCourse?.groupSubjectId)

  return { activeCourse, course, isLoading }
}
