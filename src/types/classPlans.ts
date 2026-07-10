export type ClassPlanStatus = 'planeada' | 'ejecutada' | 'pendiente' | 'cancelada'

export interface ClassPlan {
  id: number
  group_subject_id: number
  period_id: number
  class_schedule_id: number | null
  registered_by: number
  date: string
  topic: string
  objectives: string | null
  activities: string | null
  resources: string | null
  what_was_done: string | null
  pending_for_next_class: string | null
  attendance_note: string | null
  homework_assigned: string | null
  notes: string | null
  status: ClassPlanStatus
}

export const CLASS_PLAN_STATUS_LABELS: Record<ClassPlanStatus, string> = {
  planeada: '📝 Planeada',
  ejecutada: '✅ Ejecutada',
  pendiente: '🕐 Pendiente',
  cancelada: '❌ Cancelada',
}

export const CLASS_PLAN_STATUS_BADGE: Record<ClassPlanStatus, 'default' | 'success' | 'warning' | 'danger'> = {
  planeada: 'default',
  ejecutada: 'success',
  pendiente: 'warning',
  cancelada: 'danger',
}

export const CLASS_PLAN_STATUS_DOT: Record<ClassPlanStatus, string> = {
  planeada: '#1565C0',
  ejecutada: '#2E7D32',
  pendiente: '#F57C00',
  cancelada: '#C62828',
}
