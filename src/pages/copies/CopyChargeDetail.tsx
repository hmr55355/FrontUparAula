import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { copyChargesApi } from '@/services/api/copyCharges'
import { PAYMENT_STATUS_BADGE, PAYMENT_STATUS_LABELS } from '@/types/copies'
import type { CopyChargeStudent } from '@/types/copies'
import { PaymentDialog } from '@/pages/copies/PaymentDialog'

export function CopyChargeDetail() {
  const { chargeId } = useParams<{ chargeId: string }>()
  const id = Number(chargeId)
  const queryClient = useQueryClient()
  const [selectedStudent, setSelectedStudent] = useState<CopyChargeStudent | null>(null)
  const [markingAll, setMarkingAll] = useState(false)

  const { data, isLoading } = useQuery({
    queryKey: ['copy-charge-payments', id],
    queryFn: () => copyChargesApi.payments(id),
    enabled: !!id,
  })

  const markAllPaid = async () => {
    if (!data) return
    setMarkingAll(true)
    try {
      await copyChargesApi.bulkPayments(
        id,
        data.students.map((s) => ({
          student_id: s.id,
          status: 'pagado',
          amount_paid: Number(data.charge.total_amount),
        }))
      )
      toast.success('Todos los estudiantes marcados como pagados.')
      queryClient.invalidateQueries({ queryKey: ['copy-charge-payments', id] })
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
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div>
        <Link to="/copies" className="flex items-center gap-1 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Volver a copias
        </Link>
        <h1 className="mt-1 text-xl font-semibold">{data.charge.description}</h1>
        <p className="text-sm text-muted-foreground">
          {data.charge.quantity} copias × ${Number(data.charge.unit_price).toLocaleString('es-CO')} = $
          {Number(data.charge.total_amount).toLocaleString('es-CO')} — {data.charge.charge_date.slice(0, 10)}
        </p>
      </div>

      <Button size="sm" variant="outline" className="w-fit" onClick={markAllPaid} disabled={markingAll}>
        {markingAll ? 'Actualizando...' : 'Marcar todos como pagados'}
      </Button>

      <div className="flex flex-col gap-2">
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
          chargeId={id}
          totalAmount={Number(data.charge.total_amount)}
          student={selectedStudent}
          payment={data.payments[selectedStudent.id]}
        />
      )}
    </div>
  )
}
