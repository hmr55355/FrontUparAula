import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { toast } from 'sonner'
import { AlertTriangle, Pencil, Plus, RotateCcw, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { loansApi } from '@/services/api/loans'
import type { LoanFilter } from '@/services/api/loans'
import { useAuthStore } from '@/store/authStore'
import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'
import { useInvalidateLoans } from '@/hooks/useInvalidateLoans'
import { LoanDialog, ReturnLoanDialog } from '@/pages/loans/LoanDialog'
import { LOAN_CATEGORIES, RETURN_CONDITION_LABELS, borrowerName, loanCategory, loanStatusBadge } from '@/types/loans'
import type { LoanCategory, ResourceLoan } from '@/types/loans'
import { cn } from '@/lib/utils'

const FILTERS: { key: LoanFilter; label: string; count?: 'active' | 'overdue' | 'returned' }[] = [
  { key: 'activos', label: 'Sin devolver', count: 'active' },
  { key: 'vencidos', label: 'Vencidos', count: 'overdue' },
  { key: 'devueltos', label: 'Devueltos', count: 'returned' },
  { key: 'todos', label: 'Todos' },
]

/**
 * Préstamo de recursos (libros, portátiles, material tecnológico…) a estudiantes
 * y docentes. Cada docente ve y maneja los que registró; el administrador, todos.
 */
export function ResourceLoans() {
  const user = useAuthStore((s) => s.user)
  const { data: institution } = useCurrentInstitution()
  const isAdmin = institution?.my_role === 'admin'
  const invalidate = useInvalidateLoans()

  const [status, setStatus] = useState<LoanFilter>('activos')
  const [category, setCategory] = useState<LoanCategory | ''>('')
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ResourceLoan | null>(null)
  const [returning, setReturning] = useState<ResourceLoan | null>(null)

  const term = search.trim()
  const { data, isLoading } = useQuery({
    queryKey: ['resource-loans', 'list', status, category, term],
    queryFn: () => loansApi.list({ status, category: category || undefined, search: term || undefined }),
    placeholderData: (previous) => previous,
  })
  const loans = data?.data ?? []
  const summary = data?.summary

  const reopen = async (loan: ResourceLoan) => {
    try {
      await loansApi.reopen(loan.id)
      toast.success('El préstamo volvió a quedar pendiente.')
      invalidate()
    } catch {
      toast.error('No pudimos deshacer la devolución.')
    }
  }

  const remove = async (loan: ResourceLoan) => {
    if (!window.confirm(`¿Eliminar el préstamo de "${loan.item_name}" a ${borrowerName(loan)}? Úsalo solo si lo registraste por error.`)) return
    try {
      await loansApi.remove(loan.id)
      toast.success('Préstamo eliminado.')
      invalidate()
    } catch {
      toast.error('No pudimos eliminar el préstamo.')
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Préstamo de recursos</h1>
          <p className="text-sm text-muted-foreground">
            Libros, portátiles, material tecnológico y demás recursos que se entregan a estudiantes o docentes.{' '}
            {isAdmin ? 'Ves los préstamos de toda la institución.' : 'Ves los préstamos que tú registraste.'}
          </p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus className="h-4 w-4" /> Nuevo préstamo
        </Button>
      </div>

      {!!summary?.overdue && (
        <button
          type="button"
          onClick={() => setStatus('vencidos')}
          className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-left text-sm text-destructive"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>
              {summary.overdue} {summary.overdue === 1 ? 'préstamo sin devolver' : 'préstamos sin devolver'}
            </strong>{' '}
            fuera de la fecha acordada. Toca para verlos.
          </span>
        </button>
      )}

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setStatus(f.key)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm',
              status === f.key ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
            )}
          >
            {f.label}
            {f.count && summary && <span className="ml-1 text-xs opacity-70">{summary[f.count]}</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <Input
          className="min-w-[12rem] flex-1"
          placeholder="Buscar por recurso, código o persona"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          aria-label="Tipo de recurso"
          className="h-12 rounded-md border border-input bg-transparent px-2 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value as LoanCategory | '')}
        >
          <option value="">Todos los tipos</option>
          {(Object.keys(LOAN_CATEGORIES) as LoanCategory[]).map((key) => (
            <option key={key} value={key}>
              {LOAN_CATEGORIES[key].label}
            </option>
          ))}
        </select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando préstamos...</p>}
      {!isLoading && loans.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            {status === 'activos' && !term && !category
              ? 'No hay recursos prestados sin devolver.'
              : 'No hay préstamos que coincidan con el filtro.'}
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {loans.map((loan) => {
          const badge = loanStatusBadge(loan)
          const canManage = isAdmin || loan.registered_by === user?.id
          return (
            <Card key={loan.id} className={cn(loan.is_overdue && 'border-destructive/50')}>
              <CardContent className="flex flex-col gap-2 py-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {loanCategory(loan).icon} {loan.quantity > 1 && `${loan.quantity} × `}
                      {loan.item_name}
                      {loan.item_code && <span className="ml-2 text-xs font-normal text-muted-foreground">{loan.item_code}</span>}
                    </p>
                    <p className="text-sm">
                      {loan.student ? (
                        <Link to={`/student/${loan.student.id}`} className="hover:underline">
                          {borrowerName(loan)}
                        </Link>
                      ) : (
                        borrowerName(loan)
                      )}
                      <span className="text-muted-foreground">
                        {loan.student ? ` · ${loan.group?.name ?? 'Estudiante'}` : ' · Docente'}
                      </span>
                    </p>
                  </div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>

                <p className="text-xs text-muted-foreground">
                  {loanCategory(loan).label} · Prestado el {loan.loan_date.slice(0, 10)} · Devolver el {loan.due_date.slice(0, 10)}
                  {loan.returned_at && ` · Devuelto el ${loan.returned_at.slice(0, 10)}`}
                  {loan.return_condition && ` (${RETURN_CONDITION_LABELS[loan.return_condition].toLowerCase()})`}
                  {isAdmin && loan.lender && ` · Entregó: ${loan.lender.name}`}
                </p>
                {(loan.notes || loan.return_notes) && (
                  <p className="text-xs text-muted-foreground">
                    {loan.notes}
                    {loan.notes && loan.return_notes && ' · '}
                    {loan.return_notes && `Devolución: ${loan.return_notes}`}
                  </p>
                )}

                {canManage && (
                  <div className="flex flex-wrap gap-1">
                    {loan.status === 'prestado' ? (
                      <>
                        <Button size="sm" onClick={() => setReturning(loan)}>
                          Registrar devolución
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditing(loan)}>
                          <Pencil className="h-4 w-4" /> Editar
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => reopen(loan)}>
                        <RotateCcw className="h-4 w-4" /> Deshacer {loan.status === 'perdido' ? 'pérdida' : 'devolución'}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="text-destructive" onClick={() => remove(loan)}>
                      <Trash2 className="h-4 w-4" /> Eliminar
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>

      {creating && <LoanDialog open onOpenChange={setCreating} />}
      {editing && <LoanDialog key={editing.id} open onOpenChange={(o) => !o && setEditing(null)} loan={editing} />}
      {returning && <ReturnLoanDialog key={returning.id} open onOpenChange={(o) => !o && setReturning(null)} loan={returning} />}
    </div>
  )
}
