export type PaymentStatus = 'debe' | 'pago_parcial' | 'pagado' | 'exonerado'

export type ChargeConcept =
  | 'copias'
  | 'materiales'
  | 'colaboracion'
  | 'guia'
  | 'salida_pedagogica'
  | 'actividad'
  | 'fondo_curso'
  | 'rifa'
  | 'uniforme'
  | 'grado'
  | 'otro'

/**
 * Conceptos rápidos de cobro (misma lista que CopyCharge::CONCEPTS en el backend).
 * No incluye lo que la gratuidad prohíbe cobrar en colegios oficiales: matrícula,
 * carné, certificados ni boletines (Decreto 4807 de 2011).
 */
export const CHARGE_CONCEPTS: Record<ChargeConcept, { label: string; icon: string; example: string }> = {
  copias: { label: 'Copias', icon: '📄', example: 'Guía de Trigonometría Período 2' },
  materiales: { label: 'Materiales', icon: '🎨', example: 'Cartulina y marcadores para la cartelera' },
  colaboracion: { label: 'Colaboración', icon: '🤝', example: 'Colaboración para el aseo del salón' },
  guia: { label: 'Guía o módulo', icon: '📘', example: 'Módulo de Cálculo del año' },
  salida_pedagogica: { label: 'Salida pedagógica', icon: '🚌', example: 'Visita al Museo del Acordeón' },
  actividad: { label: 'Actividad o celebración', icon: '🎉', example: 'Día del estudiante' },
  fondo_curso: { label: 'Fondo del curso', icon: '💰', example: 'Fondo del salón — octubre' },
  rifa: { label: 'Rifa o bingo', icon: '🎟️', example: 'Rifa pro-grados' },
  uniforme: { label: 'Camiseta o uniforme', icon: '👕', example: 'Camiseta de la promoción' },
  grado: { label: 'Ceremonia de grado', icon: '🎓', example: 'Toga y mosaico' },
  otro: { label: 'Otro', icon: '🧾', example: 'Describe el cobro' },
}

export function chargeConcept(charge: { concept?: ChargeConcept } | undefined) {
  return CHARGE_CONCEPTS[charge?.concept ?? 'copias'] ?? CHARGE_CONCEPTS.otro
}

/** "10 copias × $200 = $2.000" para copias; "$5.000 por estudiante" para lo demás. */
export function chargeAmountLabel(charge: Pick<CopyCharge, 'concept' | 'quantity' | 'unit_price' | 'total_amount'>): string {
  const total = `$${Number(charge.total_amount).toLocaleString('es-CO')}`
  if ((charge.concept ?? 'copias') === 'copias') {
    return `${charge.quantity} copias × $${Number(charge.unit_price).toLocaleString('es-CO')} = ${total}`
  }
  return `${total} por estudiante`
}

export interface CopyCharge {
  id: number
  group_id: number
  period_id: number | null
  registered_by: number
  /** Concepto del cobro (el módulo era solo de copias; los cobros viejos son 'copias'). */
  concept?: ChargeConcept
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
