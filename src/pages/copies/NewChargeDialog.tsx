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
import type { CopyCharge } from '@/types/copies'

function today() {
  return localDateString()
}

/**
 * Crear un cobro de copias, o con `charge` editarlo y eliminarlo. Si al editar
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
  const [description, setDescription] = useState(charge?.description ?? '')
  const [quantity, setQuantity] = useState(charge ? String(charge.quantity) : '1')
  const [unitPrice, setUnitPrice] = useState(charge ? String(Number(charge.unit_price)) : '')
  const [chargeDate, setChargeDate] = useState(charge?.charge_date.slice(0, 10) ?? today())
  const [notes, setNotes] = useState(charge?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const total = (Number(quantity) || 0) * (Number(unitPrice) || 0)

  const reset = () => {
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
    if (!description || !quantity || !unitPrice) {
      toast.error('Completa la descripción, cantidad y precio unitario.')
      return
    }

    setSaving(true)
    if (charge) {
      try {
        await copyChargesApi.update(charge.id, {
          description,
          quantity: Number(quantity),
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
        description,
        quantity: Number(quantity),
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
            <Label>Descripción del material</Label>
            <Input
              placeholder='Ej: "Guía de Trigonometría Período 2"'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

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

          <div className="rounded-md bg-muted px-3 py-2 text-sm font-semibold">
            Total: ${total.toLocaleString('es-CO')}
          </div>

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
