import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { copyChargesApi } from '@/services/api/copyCharges'
import { localDateString } from '@/utils/dateHelpers'

function today() {
  return localDateString()
}

export function NewChargeDialog({
  open,
  onOpenChange,
  groupId,
  periodId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: number
  periodId?: number
}) {
  const queryClient = useQueryClient()
  const [description, setDescription] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [unitPrice, setUnitPrice] = useState('')
  const [chargeDate, setChargeDate] = useState(today())
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const total = (Number(quantity) || 0) * (Number(unitPrice) || 0)

  const reset = () => {
    setDescription('')
    setQuantity('1')
    setUnitPrice('')
    setChargeDate(today())
    setNotes('')
  }

  const save = async () => {
    if (!description || !quantity || !unitPrice) {
      toast.error('Completa la descripción, cantidad y precio unitario.')
      return
    }

    setSaving(true)
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
      queryClient.invalidateQueries({ queryKey: ['copy-charges', groupId] })
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
          <DialogTitle>Nuevo cobro</DialogTitle>
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

        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cobro'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
