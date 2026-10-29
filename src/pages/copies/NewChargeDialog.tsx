import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
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
import { SameGradeQuestion } from '@/components/SameGradeQuestion'

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
  groupName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId: number
  periodId?: number
  charge?: CopyCharge
  onDeleted?: () => void
  /** Nombre del grupo, para la pregunta de los otros cursos del grado. */
  groupName?: string
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
  // Al crear: preguntar si el cobro va también en los otros cursos del grado.
  const [asking, setAsking] = useState(false)
  const [alsoIn, setAlsoIn] = useState<number[]>([])
  const { data: siblings } = useQuery({
    queryKey: ['copy-charge-siblings', groupId],
    queryFn: () => copyChargesApi.siblingGroups(groupId),
    enabled: open && !isEdit,
    staleTime: 60 * 1000,
  })

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
    setAsking(false)
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

  /** `onlyHere`: respuesta "solo en este curso" a la pregunta de los otros cursos. */
  const save = async (onlyHere = false) => {
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
    if (!asking && siblings?.length) {
      setSaving(false)
      setAlsoIn(siblings.map((g) => g.id))
      setAsking(true)
      return
    }
    const payload = {
      period_id: periodId,
      concept,
      description,
      quantity: effectiveQuantity,
      unit_price: Number(unitPrice),
      charge_date: chargeDate,
      notes: notes || undefined,
    }
    try {
      await copyChargesApi.create({ ...payload, group_id: groupId })
      const others = onlyHere ? [] : (siblings ?? []).filter((g) => alsoIn.includes(g.id))
      const failed: string[] = []
      for (const other of others) {
        try {
          await copyChargesApi.create({ ...payload, group_id: other.id })
        } catch {
          failed.push(other.name)
        }
      }
      const extra = others.length - failed.length
      toast.success(extra > 0 ? `Cobro creado aquí y en ${extra} ${extra === 1 ? 'curso más' : 'cursos más'}.` : 'Cobro creado.')
      if (failed.length) toast.error(`No se pudo crear en ${failed.join(', ')}.`)
      invalidate()
      if (extra > 0) queryClient.invalidateQueries({ queryKey: ['copy-charges'] })
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
        {asking && siblings ? (
          <SameGradeQuestion
            what="este cobro"
            currentName={groupName ?? 'este curso'}
            options={siblings.map((g) => ({ id: g.id, label: g.name }))}
            selected={alsoIn}
            onChange={setAlsoIn}
          />
        ) : (
          <>

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
          </>
        )}
        <DialogFooter className="gap-2 sm:justify-between">
          {isEdit && !asking ? (
            <Button variant="ghost" className="text-destructive" onClick={remove} disabled={saving}>
              <Trash2 className="h-4 w-4" /> Eliminar
            </Button>
          ) : (
            <span />
          )}
          {asking ? (
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => setAsking(false)} disabled={saving}>
                Volver
              </Button>
              <Button variant="outline" onClick={() => save(true)} disabled={saving}>
                Solo en {groupName ?? 'este curso'}
              </Button>
              <Button onClick={() => save()} disabled={saving || alsoIn.length === 0}>
                {saving ? 'Guardando...' : `Crear en ${alsoIn.length + 1} cursos`}
              </Button>
            </div>
          ) : (
            <Button onClick={() => save()} disabled={saving}>
              {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : siblings?.length ? 'Continuar' : 'Guardar cobro'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
