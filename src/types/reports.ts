export type ReportType =
  | 'grade_sheet'
  | 'student_bulletin'
  | 'attendance_sheet'
  | 'behavior_citations'
  | 'academic_risk'
  | 'copies_summary'

export type ReportFormat = 'excel' | 'pdf'

export type ReportStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Report {
  id: number
  type: ReportType
  format: ReportFormat
  status: ReportStatus
  error_message: string | null
  created_at: string
}
