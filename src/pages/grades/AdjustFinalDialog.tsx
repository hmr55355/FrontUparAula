import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { gradesApi } from '@/services/api/grades'
import { gradeSheetQueryKey } from '@/pages/grades/useSaveGrade'

export function AdjustFinalDialog({
  open,
  onOpenChange,
  type,
  id,
  label,
  currentValue,
  groupSubjectId,
  periodId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'section' | 'period'
  id: number
  label: string
  currentValue: number | null
  groupSubjectId: number
  periodId: number
}) {
  const queryClient = useQueryClient()
  const [value, setValue] = useState(currentValue !== null ? String(currentValue) : '')
  const [reason, setReason] = useState('')

  const adjust = useMutation({
    mutationFn: async () => {
      if (type === 'section') {
        return gradesApi.adjustSectionFinal(id, { section_final: Number(value), adjustment_reason: reason })
      }
      return gradesApi.adjustPeriodFinal(id, { period_final: Number(value), adjustment_reason: reason })
    },
    onSuccess: () => {
      toast.success('Nota ajustada manualmente.')
      queryClient.invalidateQueries({ queryKey: gradeSheetQueryKey(groupSubjectId, periodId) })
      setReason('')
      onOpenChange(false)
    },
    onError: () => toast.error('No pudimos ajustar la nota.'),
  })

  const numericValue = Number(value)
  const canSave = value.trim() !== '' && !Number.isNaN(numericValue) && numericValue >= 1 && reason.trim() !== ''

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajustar nota manualmente</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{label}</p>
          <div className="space-y-1">
            <Label>Nueva nota</Label>
            <Input type="number" step="0.1" min={1} value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Motivo del ajuste (obligatorio)</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ej: corrección tras revisión del examen físico"
            />
          </div>
          {type === 'section' && (
            <p className="text-xs text-muted-foreground">
              Este ajuste no recalcula automáticamente la Definitiva Total del período — si corresponde, ajústala también.
            </p>
          )}
        </div>
        <DialogFooter>
          <Button onClick={() => adjust.mutate()} disabled={!canSave || adjust.isPending}>
            {adjust.isPending ? 'Guardando...' : 'Guardar ajuste'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
