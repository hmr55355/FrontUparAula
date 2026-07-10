export type DeliveryStatus = 'entregado' | 'no_entregado' | 'entregado_tarde' | 'excusado'

export interface Homework {
  id: number
  group_subject_id: number
  period_id: number
  registered_by: number
  title: string
  description: string | null
  assigned_date: string
  due_date: string
  max_score: string | number
  is_graded: boolean
  grade_column_id: number | null
  notes: string | null
  delivered_count?: number
  total_deliveries?: number
}

export interface HomeworkDelivery {
  id: number
  homework_id: number
  student_id: number
  status: DeliveryStatus
  delivery_date: string | null
  score: string | number | null
  notes: string | null
}

export interface HomeworkStudent {
  id: number
  first_name: string
  last_name: string
  photo: string | null
}

export interface HomeworkDeliveriesResponse {
  homework: Homework
  students: HomeworkStudent[]
  deliveries: Record<number, HomeworkDelivery>
}

export const DELIVERY_CYCLE: Array<DeliveryStatus | null> = [
  null,
  'entregado',
  'entregado_tarde',
  'no_entregado',
  'excusado',
]

export const DELIVERY_LABELS: Record<DeliveryStatus, string> = {
  entregado: '✅ Entregado',
  entregado_tarde: '🕐 Entregado tarde',
  no_entregado: '❌ No entregado',
  excusado: '📋 Excusado',
}

export type DueStatus = 'en_plazo' | 'vence_manana' | 'vencida'

export function getDueStatus(dueDate: string): DueStatus {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(dueDate + 'T00:00:00')
  const diffDays = Math.round((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return 'vencida'
  if (diffDays === 0 || diffDays === 1) return 'vence_manana'
  return 'en_plazo'
}

export const DUE_STATUS_LABELS: Record<DueStatus, string> = {
  en_plazo: '🟢 En plazo',
  vence_manana: '🟡 Vence pronto',
  vencida: '🔴 Vencida',
}
