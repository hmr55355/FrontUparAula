import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { classPlansApi } from '@/services/api/classPlans'
import type { ClassPlan } from '@/types/classPlans'

export function PreviousClassPlanDialog({
  open,
  onOpenChange,
  plan,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: ClassPlan | null
}) {
  const navigate = useNavigate()
  const [saving, setSaving] = useState(false)

  if (!plan) return null

  const useAsBase = async () => {
    setSaving(true)
    try {
      const newPlan = await classPlansApi.duplicateAsBase(plan.id)
      toast.success('Nueva bitácora creada a partir de la anterior.')
      onOpenChange(false)
      navigate(`/plans?open=${newPlan.id}`)
    } catch {
      toast.error('No pudimos crear la nueva bitácora.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bitácora de la clase anterior — {plan.date.slice(0, 10)}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm">
          <div>
            <p className="font-semibold text-muted-foreground">Tema</p>
            <p>{plan.topic}</p>
          </div>
          {plan.what_was_done && (
            <div>
              <p className="font-semibold text-muted-foreground">Qué se hizo</p>
              <p>{plan.what_was_done}</p>
            </div>
          )}
          {plan.pending_for_next_class && (
            <div>
              <p className="font-semibold text-muted-foreground">Pendiente para la próxima clase</p>
              <p>{plan.pending_for_next_class}</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={useAsBase} disabled={saving}>
            {saving ? 'Creando...' : 'Usar como base para hoy'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
