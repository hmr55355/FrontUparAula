import type { GradeSheetResponse, WorkGroup } from '@/types/grades'

/** Grupos de trabajo de una actividad (el backend manda [] en vez de {} cuando no hay ninguno). */
export function workGroupsOf(sheet: GradeSheetResponse, columnId: number): WorkGroup[] {
  return ((sheet.work_groups ?? {}) as Record<number, WorkGroup[]>)[columnId] ?? []
}

/** Por actividad, el grupo de cada estudiante con su número (1, 2…) para mostrarlo en la celda. */
export function workGroupIndex(sheet: GradeSheetResponse) {
  const index = new Map<number, Map<number, { number: number; group: WorkGroup }>>()
  for (const section of sheet.sections) {
    for (const column of section.columns) {
      const byStudent = new Map<number, { number: number; group: WorkGroup }>()
      workGroupsOf(sheet, column.id).forEach((group, i) => {
        group.student_ids.forEach((studentId) => byStudent.set(studentId, { number: i + 1, group }))
      })
      if (byStudent.size > 0) index.set(column.id, byStudent)
    }
  }
  return index
}
