export type BehaviorType = 'positiva' | 'negativa' | 'informativa' | 'acuerdo'
export type BehaviorCategory =
  | 'academico'
  | 'convivencia'
  | 'puntualidad'
  | 'presentacion'
  | 'participacion'
  | 'actitud'
  | 'otro'

export interface BehaviorAnnotation {
  id: number
  student_id: number
  group_id: number
  group_subject_id: number | null
  date: string
  type: BehaviorType
  category: BehaviorCategory
  title: string
  description: string
  action_taken: string | null
  requires_parent_contact: boolean
  parent_contacted: boolean
  parent_contact_date: string | null
  registered_by: number
  teacher_name?: string
  student?: { id: number; first_name: string; last_name: string }
}

export const BEHAVIOR_TYPE_LABELS: Record<BehaviorType, string> = {
  positiva: 'Positiva',
  negativa: 'Negativa',
  informativa: 'Informativa',
  acuerdo: 'Acuerdo',
}

export const BEHAVIOR_TYPE_BADGE: Record<BehaviorType, 'success' | 'danger' | 'default' | 'warning'> = {
  positiva: 'success',
  negativa: 'danger',
  informativa: 'default',
  acuerdo: 'warning',
}

export const BEHAVIOR_CATEGORY_LABELS: Record<BehaviorCategory, string> = {
  academico: 'Académico',
  convivencia: 'Convivencia',
  puntualidad: 'Puntualidad',
  presentacion: 'Presentación',
  participacion: 'Participación',
  actitud: 'Actitud',
  otro: 'Otro',
}
