import type { GroupSubject } from '@/types'

export interface ClassScheduleBlock {
  id: number
  group_subject_id: number
  user_id: number
  day_of_week: number
  start_time: string
  end_time: string
  classroom: string | null
  block_label: string | null
  academic_year_id: number
  is_active: boolean
  group_subject?: GroupSubject
}

export type CurrentClassStatus = 'en_curso' | 'proxima' | 'sin_clase_ahora'

export interface CurrentClassResponse {
  status: CurrentClassStatus
  block: ClassScheduleBlock | null
  minutes_until?: number
}

export const DAY_LABELS: Record<number, string> = {
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
}
