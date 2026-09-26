import { api } from '@/services/api/client'
import type { CopyCharge, CopyChargePaymentsResponse, PaymentStatus } from '@/types/copies'

export interface CopyChargePayload {
  group_id: number
  period_id?: number
  description: string
  quantity: number
  unit_price: number
  charge_date: string
  notes?: string
}

export interface PaymentPayload {
  student_id: number
  status: PaymentStatus
  amount_paid?: number
  payment_date?: string
  exoneration_reason?: string
  notes?: string
}

export const copyChargesApi = {
  list: (groupId: number, periodId?: number) =>
    api.get<{ data: CopyCharge[] }>('/copy-charges', { params: { groupId, periodId } }).then((r) => r.data.data),

  create: (payload: CopyChargePayload) =>
    api.post<{ data: CopyCharge }>('/copy-charges', payload).then((r) => r.data.data),

  update: (id: number, payload: Partial<CopyChargePayload>) =>
    api.put<{ data: CopyCharge }>(`/copy-charges/${id}`, payload).then((r) => r.data.data),

  remove: (id: number, confirm?: boolean) => api.delete(`/copy-charges/${id}`, { params: { confirm } }),

  payments: (id: number) => api.get<CopyChargePaymentsResponse>(`/copy-charges/${id}/payments`).then((r) => r.data),

  bulkPayments: (id: number, payments: PaymentPayload[]) =>
    api.post(`/copy-charges/${id}/payments/bulk`, { payments }),

  updatePayment: (paymentId: number, payload: PaymentPayload) =>
    api.patch(`/copy-charges/payments/${paymentId}`, payload),

  summary: (payload: { group_id: number; period_id?: number }) =>
    api.post<{ data: { id: number } }>('/copy-charges/summary', payload).then((r) => r.data.data),
}
