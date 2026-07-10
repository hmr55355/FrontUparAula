export type PaymentStatus = 'debe' | 'pago_parcial' | 'pagado' | 'exonerado'

export interface CopyCharge {
  id: number
  group_id: number
  period_id: number | null
  registered_by: number
  description: string
  quantity: number
  unit_price: string | number
  total_amount: string | number
  charge_date: string
  notes: string | null
  paid_count?: number
  total_students?: number
  collected_amount?: string | number
  pending_amount?: string | number
}

export interface StudentCopyPayment {
  id: number
  copy_charge_id: number
  student_id: number
  registered_by: number
  status: PaymentStatus
  amount_paid: string | number
  payment_date: string | null
  exoneration_reason: string | null
  notes: string | null
  copy_charge?: CopyCharge
}

export interface CopyChargeStudent {
  id: number
  first_name: string
  last_name: string
}

export interface CopyChargePaymentsResponse {
  charge: CopyCharge
  students: CopyChargeStudent[]
  payments: Record<number, StudentCopyPayment>
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  debe: '🔴 Debe',
  pago_parcial: '🟡 Pago parcial',
  pagado: '🟢 Pagado',
  exonerado: '⚫ Exonerado',
}

export const PAYMENT_STATUS_BADGE: Record<PaymentStatus, 'danger' | 'warning' | 'success' | 'secondary'> = {
  debe: 'danger',
  pago_parcial: 'warning',
  pagado: 'success',
  exonerado: 'secondary',
}
