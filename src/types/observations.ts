export type ObservationType = 'academica' | 'comportamental' | 'familiar' | 'salud' | 'seguimiento' | 'logro' | 'otro'

export interface StudentObservation {
  id: number
  student_id: number
  group_id: number
  period_id: number | null
  date: string
  type: ObservationType
  content: string
  is_private: boolean
  registered_by: number
  teacher_name?: string
  student?: { id: number; first_name: string; last_name: string }
}

export const OBSERVATION_TYPE_LABELS: Record<ObservationType, string> = {
  academica: 'Académica',
  comportamental: 'Comportamental',
  familiar: 'Familiar',
  salud: 'Salud',
  seguimiento: 'Seguimiento',
  logro: 'Logro / Reconocimiento',
  otro: 'Otro',
}
