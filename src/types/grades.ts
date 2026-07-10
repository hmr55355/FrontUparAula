export type GradeColumnType = 'manual' | 'from_attendance' | 'section_average' | 'custom_formula'
export type FinalCalculation = 'weighted_avg' | 'simple_avg' | 'manual'

export interface GradeColumn {
  id: number
  grade_section_id: number
  group_subject_id: number
  period_id: number
  column_type: GradeColumnType
  name: string
  short_name: string | null
  description: string | null
  weight: string | number
  max_score: string | number
  date: string | null
  attendance_base_score: string | number
  absence_penalty: string | number
  justified_absence_penalty: string | number
  formula: string | null
  is_visible: boolean
  sort_order: number
}

export interface GradeSection {
  id: number
  group_subject_id: number
  period_id: number
  name: string
  short_name: string | null
  weight: string | number
  color: string
  has_section_final: boolean
  section_final_label: string
  final_calculation: FinalCalculation
  sort_order: number
  is_active: boolean
  columns: GradeColumn[]
}

export interface Grade {
  id: number
  student_id: number
  grade_column_id: number
  group_subject_id: number
  period_id: number
  score: string | number | null
  is_excused: boolean
  excused_reason: string | null
  notes: string | null
  registered_by: number
}

export interface SectionFinal {
  id: number
  student_id: number
  grade_section_id: number
  section_final: string | number | null
  manually_adjusted: boolean
  adjustment_reason: string | null
}

export interface PeriodFinal {
  id: number
  student_id: number
  group_subject_id: number
  period_id: number
  period_final: string | number | null
  is_promoted: boolean | null
  manually_adjusted: boolean
  adjustment_reason: string | null
}

export interface GradeSheetStudent {
  id: number
  first_name: string
  last_name: string
  photo: string | null
}

export interface GradeSheetResponse {
  students: GradeSheetStudent[]
  sections: GradeSection[]
  grades: Record<number, Record<number, Grade>>
  section_finals: Record<number, Record<number, SectionFinal>>
  period_finals: Record<number, PeriodFinal>
  min_passing_grade: number
}

export interface GradeTemplate {
  id: number
  user_id: number
  institution_id: number | null
  name: string
  description: string | null
  is_shared: boolean
  sections_config: { sections: Array<Record<string, unknown>> }
  created_at: string
}

export interface GradeColumnDraft {
  id?: number
  name: string
  short_name: string
  column_type: GradeColumnType
  weight: number
  max_score?: number
  attendance_base_score?: number
  absence_penalty?: number
  justified_absence_penalty?: number
  formula?: string | null
}

export interface GradeSectionDraft {
  id?: number
  name: string
  short_name?: string
  weight: number
  color: string
  has_section_final: boolean
  final_calculation: FinalCalculation
  columns: GradeColumnDraft[]
}
