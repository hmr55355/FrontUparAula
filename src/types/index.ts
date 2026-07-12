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
  email: string
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
  my_role?: InstitutionRole
  created_at: string
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
  name: string
  grade_level: string
  section: string | null
  student_count: number
}

export interface Subject {
  id: number
  institution_id: number
  name: string
  code: string | null
  color: string
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
