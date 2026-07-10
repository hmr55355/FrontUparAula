import { useMutation, useQueryClient } from '@tanstack/react-query'

import { gradesApi } from '@/services/api/grades'
import type { GradeSheetResponse } from '@/types/grades'

export function gradeSheetQueryKey(groupSubjectId: number, periodId: number) {
  return ['grades-sheet', groupSubjectId, periodId] as const
}

/**
 * Saves one grade with an optimistic update to the cached sheet, then invalidates
 * so the real section/period finals (recalculated server-side via GradeObserver)
 * come back on the next fetch.
 */
export function useSaveGrade(groupSubjectId: number, periodId: number) {
  const queryClient = useQueryClient()
  const queryKey = gradeSheetQueryKey(groupSubjectId, periodId)

  return useMutation({
    mutationFn: (vars: { studentId: number; columnId: number; score: number | null }) =>
      gradesApi.save({ student_id: vars.studentId, grade_column_id: vars.columnId, score: vars.score }),

    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey })
      const previous = queryClient.getQueryData<GradeSheetResponse>(queryKey)

      queryClient.setQueryData<GradeSheetResponse>(queryKey, (old) => {
        if (!old) return old
        const studentGrades = { ...(old.grades[vars.studentId] ?? {}) }
        const existing = studentGrades[vars.columnId]

        studentGrades[vars.columnId] = {
          id: existing?.id ?? 0,
          student_id: vars.studentId,
          grade_column_id: vars.columnId,
          group_subject_id: groupSubjectId,
          period_id: periodId,
          score: vars.score,
          is_excused: existing?.is_excused ?? false,
          excused_reason: existing?.excused_reason ?? null,
          notes: existing?.notes ?? null,
          registered_by: existing?.registered_by ?? 0,
        }

        return { ...old, grades: { ...old.grades, [vars.studentId]: studentGrades } }
      })

      return { previous }
    },

    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous)
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey })
    },
  })
}
