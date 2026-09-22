import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { copyChargesApi } from '@/services/api/copyCharges'
import type { CopyChargeStudent, StudentCopyPayment } from '@/types/copies'
import { localDateString } from '@/utils/dateHelpers'

function today() {
  return localDateString()
}

export function PaymentDialog({
  open,
  onOpenChange,
  chargeId,
  totalAmount,
  student,
  payment,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  chargeId: number
  totalAmount: number
  student: CopyChargeStudent
  payment?: StudentCopyPayment
}) {
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState(String(totalAmount))
  const [paymentDate, setPaymentDate] = useState(today())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setAmount(payment ? String(payment.amount_paid) : String(totalAmount))
    setPaymentDate(payment?.payment_date?.slice(0, 10) ?? today())
    setNotes(payment?.notes ?? '')
  }, [open, payment, totalAmount])

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['copy-charge-payments', chargeId] })
    queryClient.invalidateQueries({ queryKey: ['copy-charges'] })
  }

  const savePartial = async () => {
    const value = Number(amount)
    if (!value) {
      toast.error('Ingresa un monto.')
      return
    }
    setSaving(true)
    try {
      await copyChargesApi.bulkPayments(chargeId, [
        {
          student_id: student.id,
          status: value >= totalAmount ? 'pagado' : 'pago_parcial',
          amount_paid: value,
          payment_date: paymentDate,
          notes: notes || undefined,
        },
      ])
      toast.success('Pago registrado.')
      invalidate()
      onOpenChange(false)
    } catch {
      toast.error('No pudimos registrar el pago.')
    } finally {
      setSaving(false)
    }
  }

  const markFullyPaid = async () => {
    setSaving(true)
    try {
      await copyChargesApi.bulkPayments(chargeId, [
        { student_id: student.id, status: 'pagado', amount_paid: totalAmount, payment_date: paymentDate },
      ])
      toast.success('Pago completo registrado.')
      invalidate()
      onOpenChange(false)
    } catch {
      toast.error('No pudimos registrar el pago.')
    } finally {
      setSaving(false)
    }
  }

  const exonerate = async () => {
    const reason = window.prompt('Motivo de la exoneración:')
    if (!reason) return
    setSaving(true)
    try {
      await copyChargesApi.bulkPayments(chargeId, [
        { student_id: student.id, status: 'exonerado', amount_paid: 0, exoneration_reason: reason },
      ])
      toast.success('Estudiante exonerado.')
      invalidate()
      onOpenChange(false)
    } catch {
      toast.error('No pudimos registrar la exoneración.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {student.last_name} {student.first_name}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <Label>Monto a registrar</Label>
            <Input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Fecha de pago</Label>
            <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Notas (opcional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={markFullyPaid} disabled={saving}>
              Pagado completo
            </Button>
            <Button size="sm" variant="ghost" onClick={exonerate} disabled={saving}>
              Exonerar
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={savePartial} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar pago'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
