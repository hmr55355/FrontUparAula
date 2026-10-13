import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'
import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { copyChargesApi } from '@/services/api/copyCharges'
import { localDateString } from '@/utils/dateHelpers'
import { CHARGE_CONCEPTS } from '@/types/copies'
import type { ChargeConcept, CopyCharge } from '@/types/copies'
import { cn } from '@/lib/utils'

function today() {
  return localDateString()
}

/**
 * Crear un cobro (copias, materiales, colaboración, salida…), o con `charge`
 * editarlo y eliminarlo. Copias se calcula como cantidad × precio por copia; los
 * demás conceptos son un valor por estudiante (cantidad 1). Si al editar
 * cambia el total, el backend reevalúa quién queda pagado o con pago parcial.
 */
export function NewChargeDialog({
  open,
  onOpenChange,
  groupId,
  periodId,
  charge,
  onDeleted,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: number
  periodId?: number
  charge?: CopyCharge
  onDeleted?: () => void
}) {
  const queryClient = useQueryClient()
  const isEdit = !!charge
  const [concept, setConcept] = useState<ChargeConcept>(charge?.concept ?? 'copias')
  const isCopies = concept === 'copias'
  const [description, setDescription] = useState(charge?.description ?? '')
  const [quantity, setQuantity] = useState(charge ? String(charge.quantity) : '1')
  const [unitPrice, setUnitPrice] = useState(charge ? String(Number(charge.unit_price)) : '')
  const [chargeDate, setChargeDate] = useState(charge?.charge_date.slice(0, 10) ?? today())
  const [notes, setNotes] = useState(charge?.notes ?? '')
  const [saving, setSaving] = useState(false)

  // Fuera de copias no hay "cantidad": el valor es por estudiante.
  const effectiveQuantity = isCopies ? Number(quantity) || 0 : 1
  const total = effectiveQuantity * (Number(unitPrice) || 0)

  const reset = () => {
    setConcept('copias')
    setDescription('')
    setQuantity('1')
    setUnitPrice('')
    setChargeDate(today())
    setNotes('')
  }

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['copy-charges', groupId] })
    if (charge) queryClient.invalidateQueries({ queryKey: ['copy-charge-payments', charge.id] })
  }

  const remove = async () => {
    if (!charge || !window.confirm(`¿Eliminar el cobro "${charge.description}"?`)) return
    setSaving(true)
    try {
      try {
        await copyChargesApi.remove(charge.id)
      } catch (error) {
        // 409: ya hay dinero recaudado — segunda confirmación con el monto.
        if (!(axios.isAxiosError(error) && error.response?.status === 409)) throw error
        if (!window.confirm(`${error.response?.data?.message} Se perderá el registro de esos pagos. ¿Eliminar de todas formas?`)) {
          return
        }
        await copyChargesApi.remove(charge.id, true)
      }
      toast.success('Cobro eliminado.')
      invalidate()
      onOpenChange(false)
      onDeleted?.()
    } catch {
      toast.error('No pudimos eliminar el cobro.')
    } finally {
      setSaving(false)
    }
  }

  const save = async () => {
    if (!description.trim() || !unitPrice || (isCopies && !quantity)) {
      toast.error(isCopies ? 'Completa la descripción, la cantidad y el precio por copia.' : 'Completa la descripción y el valor.')
      return
    }

    setSaving(true)
    if (charge) {
      try {
        await copyChargesApi.update(charge.id, {
          concept,
          description,
          quantity: effectiveQuantity,
          unit_price: Number(unitPrice),
          charge_date: chargeDate,
          notes: notes || undefined,
        })
        toast.success(
          total !== Number(charge.total_amount)
            ? 'Cobro actualizado. Los estados de pago se ajustaron al nuevo total.'
            : 'Cobro actualizado.'
        )
        invalidate()
        onOpenChange(false)
      } catch {
        toast.error('No pudimos actualizar el cobro.')
      } finally {
        setSaving(false)
      }
      return
    }
    try {
      await copyChargesApi.create({
        group_id: groupId,
        period_id: periodId,
        concept,
        description,
        quantity: effectiveQuantity,
        unit_price: Number(unitPrice),
        charge_date: chargeDate,
        notes: notes || undefined,
      })
      toast.success('Cobro creado.')
      invalidate()
      onOpenChange(false)
      reset()
    } catch {
      toast.error('No pudimos crear el cobro.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar cobro' : 'Nuevo cobro'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <Label>Concepto</Label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(CHARGE_CONCEPTS) as ChargeConcept[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setConcept(key)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-sm',
                    concept === key ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
                  )}
                >
                  {CHARGE_CONCEPTS[key].icon} {CHARGE_CONCEPTS[key].label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <Label>Descripción</Label>
            <Input
              placeholder={`Ej: "${CHARGE_CONCEPTS[concept].example}"`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {isCopies ? (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Cantidad de copias</Label>
                <Input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Precio por copia (COP)</Label>
                <Input type="number" min="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <Label>Valor por estudiante (COP)</Label>
              <Input type="number" min="0" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} />
            </div>
          )}

          <div className="rounded-md bg-muted px-3 py-2 text-sm font-semibold">
            Cada estudiante paga: ${total.toLocaleString('es-CO')}
          </div>

          {!isEdit && (
            <p className="text-xs text-muted-foreground">
              En colegios oficiales estos aportes son voluntarios (gratuidad, Decreto 4807 de 2011): no pagar no puede
              afectar notas ni matrícula. Usa "Exonerar" para quien no vaya a aportar.
            </p>
          )}

          <div className="space-y-1">
            <Label>Fecha del cobro</Label>
            <Input type="date" value={chargeDate} onChange={(e) => setChargeDate(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label>Notas (opcional)</Label>
            <textarea
              className="min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          {isEdit ? (
            <Button variant="ghost" className="text-destructive" onClick={remove} disabled={saving}>
              <Trash2 className="h-4 w-4" /> Eliminar
            </Button>
          ) : (
            <span />
          )}
          <Button onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Guardar cobro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
