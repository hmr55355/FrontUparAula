import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Pencil, Plus } from 'lucide-react'

import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { institutionsApi } from '@/services/api/institutions'
import { periodsApi } from '@/services/api/periods'
import { copyChargesApi } from '@/services/api/copyCharges'
import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'
import { useActiveCourseGroup } from '@/hooks/useActiveCourseGroup'
import { NewChargeDialog } from '@/pages/copies/NewChargeDialog'
import type { CopyCharge } from '@/types/copies'

export function Copies() {
  const { data: institution } = useCurrentInstitution()
  const { course } = useActiveCourseGroup()
  const [groupId, setGroupId] = useState<number | ''>('')
  const [periodId, setPeriodId] = useState<number | ''>('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<CopyCharge | null>(null)

  const { data: groups } = useQuery({
    queryKey: ['groups', institution?.id],
    queryFn: () => institutionsApi.groups(institution!.id),
    enabled: !!institution,
  })

  useEffect(() => {
    if (groupId === '' && groups && groups.length > 0) {
      setGroupId(course?.group_id && groups.some((g) => g.id === course.group_id) ? course.group_id : groups[0].id)
    }
  }, [groups, course, groupId])

  const selectedGroup = groups?.find((g) => g.id === groupId)
  const { data: periods } = useQuery({
    queryKey: ['periods', selectedGroup?.academic_year_id],
    queryFn: () => periodsApi.list(selectedGroup!.academic_year_id),
    enabled: !!selectedGroup,
  })

  const { data: charges, isLoading } = useQuery({
    queryKey: ['copy-charges', groupId, periodId],
    queryFn: () => copyChargesApi.list(groupId as number, periodId || undefined),
    enabled: !!groupId,
  })

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-xl font-semibold">Control de copias</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)} disabled={!groupId}>
          <Plus className="h-4 w-4" /> Nuevo cobro
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="w-48">
          <SearchableSelect value={groupId} onChange={setGroupId} options={(groups ?? []).map((g) => ({ id: g.id, label: g.name }))} />
        </div>
        <select
          className="h-10 rounded-md border border-input bg-transparent px-2 text-sm"
          value={periodId}
          onChange={(e) => setPeriodId(e.target.value ? Number(e.target.value) : '')}
        >
          <option value="">Todos los períodos</option>
          {periods?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando cobros...</p>}

      <div className="flex flex-col gap-2">
        {!isLoading && (!charges || charges.length === 0) && (
          <p className="text-sm text-muted-foreground">Sin cobros registrados para este grupo.</p>
        )}
        {charges?.map((charge) => {
          const total = Number(charge.total_amount)
          const collected = Number(charge.collected_amount ?? 0)
          const pending = Number(charge.pending_amount ?? total)
          const progress = total > 0 ? Math.round((collected / total) * 100) : 0

          return (
            <Card key={charge.id}>
              <CardContent className="flex flex-col gap-2 py-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{charge.description}</span>
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-muted-foreground">{charge.charge_date.slice(0, 10)}</span>
                    <button
                      type="button"
                      className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                      aria-label="Editar cobro"
                      onClick={() => setEditing(charge)}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {charge.quantity} copias × ${Number(charge.unit_price).toLocaleString('es-CO')} = $
                  {total.toLocaleString('es-CO')}
                </p>
                <p className="text-sm">
                  {charge.paid_count ?? 0} de {charge.total_students ?? 0} estudiantes han pagado — $
                  {pending.toLocaleString('es-CO')} pendientes
                </p>
                <Progress value={progress} />
                <Button size="sm" variant="outline" className="w-fit" asChild>
                  <Link to={`/copies/${charge.id}`}>Ver detalle de pagos</Link>
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {groupId && editing && (
        <NewChargeDialog
          key={editing.id}
          open
          onOpenChange={(open) => !open && setEditing(null)}
          groupId={groupId}
          charge={editing}
        />
      )}

      {groupId && (
        <NewChargeDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          groupId={groupId}
          periodId={periodId || undefined}
        />
      )}
    </div>
  )
}
