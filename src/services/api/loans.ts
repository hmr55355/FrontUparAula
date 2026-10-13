import { api } from '@/services/api/client'
import type { LoanCategory, ResourceLoan, ReturnCondition } from '@/types/loans'

export type LoanFilter = 'activos' | 'vencidos' | 'devueltos' | 'todos'

export interface LoanPayload {
  student_id?: number | null
  borrower_user_id?: number | null
  category: LoanCategory
  item_name: string
  quantity: number
  item_code?: string | null
  loan_date: string
  due_date: string
  notes?: string | null
}

export interface LoansResponse {
  data: ResourceLoan[]
  summary: { active: number; overdue: number; returned: number }
}

export interface LoanAlerts {
  /** Vencidos entre los que yo entregué (todos los de la institución si soy admin). */
  overdue_lent: number
  /** Lo que yo tengo en préstamo sin devolver. */
  borrowed: ResourceLoan[]
}

export const loansApi = {
  list: (params: { status: LoanFilter; category?: LoanCategory; search?: string }) =>
    api.get<LoansResponse>('/resource-loans', { params }).then((r) => r.data),

  create: (payload: LoanPayload) => api.post<{ data: ResourceLoan }>('/resource-loans', payload).then((r) => r.data.data),

  update: (id: number, payload: Partial<LoanPayload>) =>
    api.put<{ data: ResourceLoan }>(`/resource-loans/${id}`, payload).then((r) => r.data.data),

  markReturned: (
    id: number,
    payload: { status: 'devuelto' | 'perdido'; returned_at?: string; return_condition?: ReturnCondition; return_notes?: string }
  ) => api.post<{ data: ResourceLoan }>(`/resource-loans/${id}/return`, payload).then((r) => r.data.data),

  reopen: (id: number) => api.post<{ data: ResourceLoan }>(`/resource-loans/${id}/reopen`).then((r) => r.data.data),

  remove: (id: number) => api.delete(`/resource-loans/${id}`),

  alerts: () => api.get<LoanAlerts>('/resource-loans/alerts').then((r) => r.data),

  teachers: () => api.get<{ data: { id: number; name: string }[] }>('/resource-loans/teachers').then((r) => r.data.data),
}
