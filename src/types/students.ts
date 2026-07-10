import type { BehaviorAnnotation } from '@/types/behavior'
import type { ParentCitation } from '@/types/citations'
import type { ParentGuardian } from '@/types/parents'
import type { StudentObservation } from '@/types/observations'
import type { StudentCopyPayment } from '@/types/copies'

export interface StudentGradeSummary {
  group_subject_id: number
  subject_name: string
  subject_color: string
  group_name: string
  period_final: string | number | null
  is_promoted: boolean | null
}

export interface StudentAttendanceSummary {
  group_subject_id: number
  subject_name: string
  presente: number
  ausente_injustificado: number
  ausente_justificado: number
  tarde: number
}

export interface StudentFullProfile {
  student: {
    id: number
    first_name: string
    last_name: string
    document_type: string
    document_number: string | null
    is_active: boolean
    photo: string | null
  }
  active_period: { id: number; name: string } | null
  grades: StudentGradeSummary[]
  attendance_summary: StudentAttendanceSummary[]
  behavior: BehaviorAnnotation[]
  observations: StudentObservation[]
  parents: ParentGuardian[]
  citations: ParentCitation[]
  copy_payments: StudentCopyPayment[]
}
