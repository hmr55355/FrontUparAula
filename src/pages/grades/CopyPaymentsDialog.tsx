import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { copyChargesApi } from '@/services/api/copyCharges'
import { PAYMENT_STATUS_BADGE, PAYMENT_STATUS_LABELS } from '@/types/copies'
import type { CopyChargeStudent } from '@/types/copies'
import { PaymentDialog } from '@/pages/copies/PaymentDialog'

export function CopyPaymentsDialog({
  open,
  onOpenChange,
  groupId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: number
}) {
  const [chargeId, setChargeId] = useState<number | null>(null)

  const close = (nextOpen: boolean) => {
    if (!nextOpen) setChargeId(null)
    onOpenChange(nextOpen)
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-2xl">
        {chargeId === null ? (
          <ChargeList groupId={groupId} onSelect={setChargeId} />
        ) : (
          <ChargeDetail chargeId={chargeId} onBack={() => setChargeId(null)} />
        )}
      </DialogContent>
    </Dialog>
  )
}

function ChargeList({ groupId, onSelect }: { groupId: number; onSelect: (id: number) => void }) {
  // Sin filtro de período por defecto: un cobro de copias suele no estar atado a un período
  // específico, igual que la vista "Todos los períodos" de /copies.
  const { data: charges, isLoading } = useQuery({
    queryKey: ['copy-charges', groupId, undefined],
    queryFn: () => copyChargesApi.list(groupId),
  })

  return (
    <>
      <DialogHeader>
        <DialogTitle>Pagos de copias</DialogTitle>
      </DialogHeader>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando cobros...</p>}

      <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
        {!isLoading && (!charges || charges.length === 0) && (
          <p className="text-sm text-muted-foreground">Sin cobros registrados para este grupo.</p>
        )}
        {charges?.map((charge) => {
          const total = Number(charge.total_amount)
          const collected = Number(charge.collected_amount ?? 0)
          const pending = Number(charge.pending_amount ?? total)
          const progress = total > 0 ? Math.round((collected / total) * 100) : 0

          return (
            <Card
              key={charge.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => onSelect(charge.id)}
            >
              <CardContent className="flex flex-col gap-2 py-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{charge.description}</span>
                  <span className="text-sm text-muted-foreground">{charge.charge_date.slice(0, 10)}</span>
                </div>
                <p className="text-sm">
                  {charge.paid_count ?? 0} de {charge.total_students ?? 0} estudiantes han pagado — $
                  {pending.toLocaleString('es-CO')} pendientes
                </p>
                <Progress value={progress} />
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}

function ChargeDetail({ chargeId, onBack }: { chargeId: number; onBack: () => void }) {
  const queryClient = useQueryClient()
  const [selectedStudent, setSelectedStudent] = useState<CopyChargeStudent | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['copy-charge-payments', chargeId],
    queryFn: () => copyChargesApi.payments(chargeId),
  })

  const markAllPaid = async () => {
    if (!data) return
    setMarkingAll(true)
    try {
      await copyChargesApi.bulkPayments(
        chargeId,
        data.students.map((s) => ({
          student_id: s.id,
          status: 'pagado',
          amount_paid: Number(data.charge.total_amount),
        }))
      )
      toast.success('Todos los estudiantes marcados como pagados.')
      queryClient.invalidateQueries({ queryKey: ['copy-charge-payments', chargeId] })
      queryClient.invalidateQueries({ queryKey: ['copy-charges'] })
    } catch {
      toast.error('No pudimos actualizar los pagos.')
    } finally {
      setMarkingAll(false)
    }
  }

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">Cargando cobro...</p>
  }

  return (
    <>
      <DialogHeader>
        <Button variant="ghost" size="sm" className="w-fit" onClick={onBack}>
          <ChevronLeft className="h-4 w-4" /> Volver a cobros
        </Button>
        <DialogTitle>{data.charge.description}</DialogTitle>
        <p className="text-sm text-muted-foreground">
          {data.charge.quantity} copias × ${Number(data.charge.unit_price).toLocaleString('es-CO')} = $
          {Number(data.charge.total_amount).toLocaleString('es-CO')}
        </p>
      </DialogHeader>

      <Button size="sm" variant="outline" className="w-fit" onClick={markAllPaid} disabled={markingAll}>
        {markingAll ? 'Actualizando...' : 'Marcar todos como pagados'}
      </Button>

      <div className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto">
        {data.students.map((student) => {
          const payment = data.payments[student.id]
          return (
            <Card
              key={student.id}
              className="cursor-pointer transition-colors hover:bg-muted/50"
              onClick={() => setSelectedStudent(student)}
            >
              <CardContent className="flex items-center justify-between py-3">
                <div>
                  <p className="font-medium">
                    {student.last_name} {student.first_name}
                  </p>
                  {payment?.payment_date && (
                    <p className="text-sm text-muted-foreground">
                      ${Number(payment.amount_paid).toLocaleString('es-CO')} · {payment.payment_date.slice(0, 10)}
                    </p>
                  )}
                </div>
                <Badge variant={PAYMENT_STATUS_BADGE[payment?.status ?? 'debe']}>
                  {PAYMENT_STATUS_LABELS[payment?.status ?? 'debe']}
                </Badge>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {selectedStudent && (
        <PaymentDialog
          open={!!selectedStudent}
          onOpenChange={(open) => !open && setSelectedStudent(null)}
          chargeId={chargeId}
          totalAmount={Number(data.charge.total_amount)}
          student={selectedStudent}
          payment={data.payments[selectedStudent.id]}
        />
      )}
    </>
  )
}
