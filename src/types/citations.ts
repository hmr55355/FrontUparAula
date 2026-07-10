export type CitationType = 'academica' | 'comportamiento' | 'seguimiento' | 'entrega_boletin' | 'general'
export type CitationStatus = 'pendiente' | 'notificado' | 'confirmado' | 'realizado' | 'no_asistio' | 'reprogramado'
export type NotificationMethod = 'celular' | 'whatsapp' | 'correo' | 'agenda' | 'otro'

export interface ParentCitation {
  id: number
  student_id: number
  parent_id: number | null
  group_id: number
  behavior_annotation_id: number | null
  citation_type: CitationType
  reason: string
  scheduled_date: string | null
  location: string | null
  status: CitationStatus
  notification_method: NotificationMethod | null
  notification_date: string | null
  outcome: string | null
  commitments: string | null
  follow_up_date: string | null
  student?: { id: number; first_name: string; last_name: string }
  parent?: { id: number; first_name: string; last_name: string; phone: string; relationship: string }
}

export const CITATION_STATUS_LABELS: Record<CitationStatus, string> = {
  pendiente: '⚪ Pendiente',
  notificado: '🔵 Notificado',
  confirmado: '🟡 Confirmado',
  realizado: '🟢 Realizado',
  no_asistio: '🔴 No asistió',
  reprogramado: '🟠 Reprogramado',
}

export const CITATION_STATUS_BADGE: Record<CitationStatus, 'secondary' | 'default' | 'warning' | 'success' | 'danger'> = {
  pendiente: 'secondary',
  notificado: 'default',
  confirmado: 'warning',
  realizado: 'success',
  no_asistio: 'danger',
  reprogramado: 'warning',
}

export const CITATION_TYPE_LABELS: Record<CitationType, string> = {
  academica: 'Académica',
  comportamiento: 'Comportamiento',
  seguimiento: 'Seguimiento',
  entrega_boletin: 'Entrega de boletín',
  general: 'General',
}
