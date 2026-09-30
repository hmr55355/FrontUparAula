import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { InlineNameEdit } from '@/components/ui/inline-name-edit'
import { gradeTemplatesApi } from '@/services/api/gradeTemplates'
import { useAuthStore } from '@/store/authStore'
import type { GradeTemplate } from '@/types/grades'

/**
 * Plantillas de planilla: guardar la configuración actual como plantilla y
 * renombrar, compartir o eliminar las propias. Las compartidas por otros docentes
 * se pueden usar pero no editar (el backend solo deja al dueño).
 */
export function TemplatesDialog({
  open,
  onOpenChange,
  templates,
  institutionId,
  groupSubjectId,
  periodId,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  templates: GradeTemplate[]
  institutionId: number
  groupSubjectId: number
  periodId: number
}) {
  const queryClient = useQueryClient()
  const userId = useAuthStore((s) => s.user?.id)
  const [name, setName] = useState('')
  const [shared, setShared] = useState(true)
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['grade-templates', institutionId] })

  const create = useMutation({
    mutationFn: () =>
      gradeTemplatesApi.save({ group_subject_id: groupSubjectId, period_id: periodId, name: name.trim(), is_shared: shared }),
    onSuccess: () => {
      toast.success('Plantilla guardada.')
      setName('')
      invalidate()
    },
    onError: () => toast.error('No pudimos guardar la plantilla. Guarda primero la configuración actual.'),
  })

  const update = useMutation({
    mutationFn: (vars: { id: number; name?: string; is_shared?: boolean }) => {
      const { id, ...payload } = vars
      return gradeTemplatesApi.update(id, payload)
    },
    onSuccess: () => {
      toast.success('Plantilla actualizada.')
      invalidate()
    },
    onError: () => toast.error('No pudimos actualizar la plantilla.'),
  })

  const remove = useMutation({
    mutationFn: (id: number) => gradeTemplatesApi.remove(id),
    onSuccess: () => {
      toast.success('Plantilla eliminada.')
      invalidate()
    },
    onError: () => toast.error('No pudimos eliminar la plantilla.'),
  })

  const mine = templates.filter((t) => t.user_id === userId)
  const others = templates.filter((t) => t.user_id !== userId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Plantillas de planilla</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Guardar esta planilla como plantilla</p>
          <p className="text-xs text-muted-foreground">
            Toma la última configuración guardada; si hiciste cambios, guárdalos antes.
          </p>
          <div className="space-y-1">
            <Label className="text-xs">Nombre</Label>
            <Input value={name} placeholder="Matemáticas 4 secciones" onChange={(e) => setName(e.target.value)} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={shared} onChange={(e) => setShared(e.target.checked)} />
            Compartirla con los docentes de la institución
          </label>
          <Button size="sm" className="w-fit" onClick={() => create.mutate()} disabled={!name.trim() || create.isPending}>
            {create.isPending ? 'Guardando...' : 'Guardar plantilla'}
          </Button>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">Mis plantillas</p>
          {mine.length === 0 && <p className="text-sm text-muted-foreground">Aún no tienes plantillas.</p>}
          {mine.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
              <InlineNameEdit value={t.name} onSave={(value) => update.mutate({ id: t.id, name: value })} />
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={t.is_shared}
                    onChange={(e) => update.mutate({ id: t.id, is_shared: e.target.checked })}
                  />
                  Compartida
                </label>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  aria-label={`Eliminar ${t.name}`}
                  onClick={() =>
                    window.confirm(`¿Eliminar la plantilla "${t.name}"? Las planillas que ya la usaron no cambian.`) &&
                    remove.mutate(t.id)
                  }
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {others.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-semibold uppercase text-muted-foreground">Compartidas por otros docentes</p>
            {others.map((t) => (
              <p key={t.id} className="rounded-md border px-3 py-2 text-sm text-muted-foreground">
                {t.name}
              </p>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
