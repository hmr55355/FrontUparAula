export type LoanCategory =
  | 'libro'
  | 'material'
  | 'portatil'
  | 'tecnologia'
  | 'laboratorio'
  | 'audiovisual'
  | 'deportivo'
  | 'musical'
  | 'otro'

/** Tipos de recurso (misma lista que ResourceLoan::CATEGORIES en el backend). */
export const LOAN_CATEGORIES: Record<LoanCategory, { label: string; icon: string; example: string }> = {
  libro: { label: 'Libro', icon: '📚', example: 'Cálculo de Stewart' },
  material: { label: 'Material didáctico', icon: '📐', example: 'Juego de escuadras y compás' },
  portatil: { label: 'Portátil o tablet', icon: '💻', example: 'Portátil 07' },
  tecnologia: { label: 'Material tecnológico', icon: '🤖', example: 'micro:bit' },
  laboratorio: { label: 'Laboratorio', icon: '🔬', example: 'Multímetro' },
  audiovisual: { label: 'Audiovisual', icon: '📽️', example: 'Video beam' },
  deportivo: { label: 'Deportivo', icon: '⚽', example: 'Balón de voleibol' },
  musical: { label: 'Instrumento musical', icon: '🎸', example: 'Guitarra' },
  otro: { label: 'Otro', icon: '📦', example: 'Describe el recurso' },
}

export type LoanStatus = 'prestado' | 'devuelto' | 'perdido'
export type ReturnCondition = 'bueno' | 'danado' | 'incompleto'

export const RETURN_CONDITION_LABELS: Record<ReturnCondition, string> = {
  bueno: 'En buen estado',
  danado: 'Dañado',
  incompleto: 'Incompleto',
}

/** Préstamo de un recurso a un estudiante o a un docente. */
export interface ResourceLoan {
  id: number
  registered_by: number
  student_id: number | null
  borrower_user_id: number | null
  group_id: number | null
  category: LoanCategory
  item_name: string
  quantity: number
  item_code: string | null
  loan_date: string
  due_date: string
  status: LoanStatus
  returned_at: string | null
  return_condition: ReturnCondition | null
  notes: string | null
  return_notes: string | null
  /** Sin devolver y con la fecha de devolución ya pasada (lo calcula el backend). */
  is_overdue: boolean
  days_overdue: number
  student?: { id: number; first_name: string; last_name: string } | null
  borrower_user?: { id: number; name: string } | null
  group?: { id: number; name: string } | null
  lender?: { id: number; name: string } | null
}

export function loanCategory(loan: Pick<ResourceLoan, 'category'>) {
  return LOAN_CATEGORIES[loan.category] ?? LOAN_CATEGORIES.otro
}

export function borrowerName(loan: ResourceLoan): string {
  if (loan.student) return `${loan.student.last_name} ${loan.student.first_name}`
  return loan.borrower_user?.name ?? '—'
}

/** Texto y variante de la insignia de estado. */
export function loanStatusBadge(loan: ResourceLoan): { label: string; variant: 'danger' | 'warning' | 'success' | 'secondary' } {
  if (loan.status === 'devuelto') return { label: 'Devuelto', variant: 'success' }
  if (loan.status === 'perdido') return { label: 'Perdido', variant: 'secondary' }
  if (loan.is_overdue) {
    return { label: `Vencido hace ${loan.days_overdue} ${loan.days_overdue === 1 ? 'día' : 'días'}`, variant: 'danger' }
  }
  return { label: 'Prestado', variant: 'warning' }
}
