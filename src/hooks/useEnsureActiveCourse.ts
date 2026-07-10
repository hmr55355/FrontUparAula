import { useEffect } from 'react'

import { useActiveCourseStore } from '@/store/activeCourseStore'
import type { GroupSubject } from '@/types'

/**
 * Restores the last active course on load, or falls back to the first course
 * available to the teacher if they no longer have access to the stored one.
 */
export function useEnsureActiveCourse(courses: GroupSubject[] | undefined) {
  const { activeCourse, setActiveCourse } = useActiveCourseStore()

  useEffect(() => {
    if (!courses || courses.length === 0) {
      return
    }

    const stillHasAccess = activeCourse && courses.some((c) => c.id === activeCourse.groupSubjectId)

    if (!stillHasAccess) {
      const first = courses[0]
      setActiveCourse({
        groupSubjectId: first.id,
        groupName: first.group?.name ?? '',
        subjectName: first.subject?.name ?? '',
        subjectColor: first.subject?.color ?? '#1565C0',
      })
    }
  }, [courses, activeCourse, setActiveCourse])

  return activeCourse
}
