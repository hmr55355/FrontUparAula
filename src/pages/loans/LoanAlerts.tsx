import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { AlertTriangle } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { loansApi } from '@/services/api/loans'
import { loanCategory, loanStatusBadge } from '@/types/loans'

function useLoanAlerts() {
  return useQuery({ queryKey: ['resource-loans', 'alerts'], queryFn: loansApi.alerts, staleTime: 60 * 1000 })
}

/** Avisos de no devolución en Inicio: lo que presté y no ha vuelto, y lo que yo debo devolver. */
export function LoanAlertsBanner() {
  const { data } = useLoanAlerts()
  const mineOverdue = data?.borrowed.filter((l) => l.is_overdue) ?? []
  if (!data || (data.overdue_lent === 0 && mineOverdue.length === 0)) return null

  return (
    <div className="flex flex-col gap-2">
      {data.overdue_lent > 0 && (
        <Link
          to="/loans"
          className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>
              {data.overdue_lent} {data.overdue_lent === 1 ? 'recurso prestado no ha sido devuelto' : 'recursos prestados no han sido devueltos'}
            </strong>{' '}
            y ya pasó la fecha acordada. Ver préstamos.
          </span>
        </Link>
      )}
      {mineOverdue.length > 0 && (
        <Link
          to="/profile"
          className="flex items-center gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            <strong>Tienes {mineOverdue.length === 1 ? 'un recurso' : `${mineOverdue.length} recursos`} por devolver</strong> fuera de
            fecha: {mineOverdue.map((l) => l.item_name).join(', ')}.
          </span>
        </Link>
      )}
    </div>
  )
}

/** En "Mi perfil": los recursos que el docente tiene en préstamo sin devolver. */
export function BorrowedLoansCard() {
  const { data } = useLoanAlerts()
  const borrowed = data?.borrowed ?? []
  if (borrowed.length === 0) return null
  const overdue = borrowed.filter((l) => l.is_overdue).length

  return (
    <Card className={overdue ? 'border-destructive/50' : undefined}>
      <CardHeader>
        <CardTitle>Recursos que tengo en préstamo</CardTitle>
        <CardDescription>
          {overdue > 0 ? (
            <span className="flex items-center gap-1 text-destructive">
              <AlertTriangle className="h-4 w-4" />
              {overdue === 1 ? 'Uno está' : `${overdue} están`} fuera de la fecha de devolución.
            </span>
          ) : (
            'Devuélvelos a quien te los entregó antes de la fecha acordada.'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        {borrowed.map((loan) => {
          const badge = loanStatusBadge(loan)
          return (
            <div key={loan.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm">
              <div>
                <p className="font-medium">
                  {loanCategory(loan).icon} {loan.quantity > 1 && `${loan.quantity} × `}
                  {loan.item_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  Devolver el {loan.due_date.slice(0, 10)}
                  {loan.lender && ` · Entregó: ${loan.lender.name}`}
                </p>
              </div>
              <Badge variant={badge.variant}>{badge.label}</Badge>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
