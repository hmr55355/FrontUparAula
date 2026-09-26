export type InstitutionRole = 'admin' | 'teacher'
export type MembershipStatus = 'active' | 'pending' | 'rejected'

export interface InstitutionMembership {
  institution_id: number
  institution_name?: string
  role: InstitutionRole
  status: MembershipStatus
}

export interface User {
  id: number
  name: string
  /** Null para cuentas de monitor, que entran con `username`. */
  email: string | null
  username?: string | null
  account_type?: 'teacher' | 'monitor'
  avatar: string | null
  phone: string | null
  notification_preferences: Record<string, boolean> | null
  institutions?: InstitutionMembership[]
  created_at: string
}

export interface Institution {
  id: number
  name: string
  city: string
  department: string
  nit: string | null
  rector: string | null
  logo: string | null
  grading_scale: '1_to_10' | '1_to_5'
  min_passing_grade: string
  /** Escala de valoración institucional (SIEE), de la nota más baja a la más alta. */
  performance_levels?: PerformanceLevel[]
  my_role?: InstitutionRole
  created_at: string
}

/** Escala nacional (Decreto 1290 de 2009, art. 5): toda escala institucional debe expresar su equivalencia. */
export type NationalLevel = 'bajo' | 'basico' | 'alto' | 'superior'

export const NATIONAL_LEVELS: NationalLevel[] = ['bajo', 'basico', 'alto', 'superior']

export const NATIONAL_LEVEL_LABELS: Record<NationalLevel, string> = {
  bajo: 'Desempeño Bajo',
  basico: 'Desempeño Básico',
  alto: 'Desempeño Alto',
  superior: 'Desempeño Superior',
}

/** Nivel de la escala institucional: rango de notas, equivalencia nacional y color en la planilla. */
export interface PerformanceLevel {
  id?: number
  name: string
  national_level: NationalLevel
  min_score: string | number
  max_score: string | number
  color: string
}

export interface AcademicYear {
  id: number
  institution_id: number
  year: number
  is_active: boolean
  start_date: string
  end_date: string
}

export interface Period {
  id: number
  academic_year_id: number
  number: number
  name: string
  start_date: string
  end_date: string
  is_active: boolean
  is_closed: boolean
}

export interface Group {
  id: number
  institution_id: number
  academic_year_id: number
  grade_level_id: number | null
  shift_id: number | null
  name: string
  /** Texto heredado (ej. "10"); el grado real es grade_level_id. */
  grade_level: string
  section: string | null
  student_count: number
  shift?: { id: number; name: string } | null
}

/** Grado escolar (Sexto…Once). */
export interface GradeLevel {
  id: number
  name: string
  level: number | null
  sort_order: number
  groups_count?: number
  subject_ids?: number[]
}

export type ClassBlockType = 'clase' | 'descanso'

/** Bloque del horario de una jornada (hora de clase o descanso). Horas en HH:mm[:ss]. */
export interface ClassBlock {
  id?: number
  type: ClassBlockType
  label: string
  start_time: string
  end_time: string
}

/** Jornada (mañana, tarde…): sus grupos y su propio horario de bloques. */
export interface Shift {
  id: number
  name: string
  sort_order: number
  groups_count?: number
  class_blocks?: ClassBlock[]
}

export interface Subject {
  id: number
  institution_id: number
  name: string
  code: string | null
  color: string
  grade_level_ids?: number[]
}

export interface GroupSubject {
  id: number
  group_id: number
  subject_id: number
  user_id: number
  institution_id: number
  academic_year_id: number
  is_active: boolean
  group?: Group
  subject?: Subject
  teacher?: { id: number; name: string }
}

export interface ActiveCourse {
  groupSubjectId: number
  groupName: string
  subjectName: string
  subjectColor: string
}
