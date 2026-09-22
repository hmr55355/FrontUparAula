import { api } from '@/services/api/client'
import type { ClassBlock, GradeLevel, Shift } from '@/types'

/** Grados, jornadas y bloques de horario de la institución. */
export const academicStructureApi = {
  gradeLevels: (institutionId: number) =>
    api.get<{ data: GradeLevel[] }>(`/institutions/${institutionId}/grade-levels`).then((r) => r.data.data),

  createGradeLevel: (institutionId: number, payload: { name: string; level: number | null }) =>
    api.post<{ data: GradeLevel }>(`/institutions/${institutionId}/grade-levels`, payload).then((r) => r.data.data),

  deleteGradeLevel: (id: number) => api.delete(`/grade-levels/${id}`),

  shifts: (institutionId: number) =>
    api.get<{ data: Shift[] }>(`/institutions/${institutionId}/shifts`).then((r) => r.data.data),

  createShift: (institutionId: number, name: string) =>
    api.post<{ data: Shift }>(`/institutions/${institutionId}/shifts`, { name }).then((r) => r.data.data),

  renameShift: (id: number, name: string) => api.put<{ data: Shift }>(`/shifts/${id}`, { name }).then((r) => r.data.data),

  deleteShift: (id: number) => api.delete(`/shifts/${id}`),

  saveBlocks: (shiftId: number, blocks: ClassBlock[]) =>
    api
      .put<{ data: ClassBlock[] }>(`/shifts/${shiftId}/class-blocks`, {
        blocks: blocks.map(({ type, label, start_time, end_time }) => ({
          type,
          label,
          start_time: start_time.slice(0, 5),
          end_time: end_time.slice(0, 5),
        })),
      })
      .then((r) => r.data.data),

  inferBlocks: (shiftId: number) =>
    api.get<{ data: ClassBlock[] }>(`/shifts/${shiftId}/class-blocks/infer`).then((r) => r.data.data),
}

/** Nombres estándar de grados en Colombia, para crearlos con un clic. */
export const STANDARD_GRADE_LEVELS: Array<{ level: number; name: string }> = [
  { level: 0, name: 'Transición' },
  { level: 1, name: 'Primero' },
  { level: 2, name: 'Segundo' },
  { level: 3, name: 'Tercero' },
  { level: 4, name: 'Cuarto' },
  { level: 5, name: 'Quinto' },
  { level: 6, name: 'Sexto' },
  { level: 7, name: 'Séptimo' },
  { level: 8, name: 'Octavo' },
  { level: 9, name: 'Noveno' },
  { level: 10, name: 'Décimo' },
  { level: 11, name: 'Once' },
]
