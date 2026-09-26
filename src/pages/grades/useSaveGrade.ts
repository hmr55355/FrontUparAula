import { useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { gradesApi } from '@/services/api/grades'
import type { GradeSheetResponse } from '@/types/grades'

export function gradeSheetQueryKey(groupSubjectId: number, periodId: number) {
  return ['grades-sheet', groupSubjectId, periodId] as const
}

const INVALIDATE_DEBOUNCE_MS = 600

/**
 * Saves one grade with an optimistic update to the cached sheet, then invalidates
 * so the real section/period finals (recalculated server-side via GradeObserver)
 * come back on the next fetch. The invalidation is debounced: a burst of saves
 * (quick-grade mode looping through many students, or fast sequential edits)
 * collapses into a single full-sheet refetch instead of one per save.
 */
export function useSaveGrade(groupSubjectId: number, periodId: number) {
  const queryClient = useQueryClient()
  const queryKey = gradeSheetQueryKey(groupSubjectId, periodId)
  const invalidateTimeout = useRef<ReturnType<typeof setTimeout>>()

  return useMutation({
    // Con convención, `score` es el valor de la convención (para el cambio optimista);
    // el servidor lo recalcula de todas formas a partir de convention_id.
    mutationFn: (vars: { studentId: number; columnId: number; score: number | null; conventionId?: number | null }) =>
      gradesApi.save({
        student_id: vars.studentId,
        grade_column_id: vars.columnId,
        score: vars.score,
        convention_id: vars.conventionId ?? null,
      }),

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
          convention_id: vars.conventionId ?? null,
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
      toast.error('No pudimos guardar la nota.')
    },

    onSettled: () => {
      if (invalidateTimeout.current) {
        clearTimeout(invalidateTimeout.current)
      }
      invalidateTimeout.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey })
      }, INVALIDATE_DEBOUNCE_MS)
    },
  })
}
