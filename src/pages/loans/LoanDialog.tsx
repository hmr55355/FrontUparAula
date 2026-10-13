import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { institutionsApi } from '@/services/api/institutions'
import { groupsApi } from '@/services/api/groups'
import { loansApi } from '@/services/api/loans'
import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'
import { useInvalidateLoans } from '@/hooks/useInvalidateLoans'
import { localDateString } from '@/utils/dateHelpers'
import { LOAN_CATEGORIES, borrowerName } from '@/types/loans'
import type { LoanCategory, ResourceLoan } from '@/types/loans'
import { cn } from '@/lib/utils'

function daysFromNow(days: number) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return localDateString(date)
}

/**
 * Registrar un préstamo, o con `loan` editarlo (el prestatario no cambia: sería
 * otro préstamo). Con `presetStudent` el estudiante viene fijo (desde su perfil).
 */
export function LoanDialog({
  open,
  onOpenChange,
  loan,
  presetStudent,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan?: ResourceLoan
  presetStudent?: { id: number; name: string }
}) {
  const invalidate = useInvalidateLoans()
  const { data: institution } = useCurrentInstitution()
  const isEdit = !!loan
  const borrowerFixed = isEdit || !!presetStudent

  const [borrowerType, setBorrowerType] = useState<'student' | 'teacher'>(loan?.borrower_user_id ? 'teacher' : 'student')
  const [groupId, setGroupId] = useState<number | ''>('')
  const [studentId, setStudentId] = useState<number | ''>(presetStudent?.id ?? '')
  const [teacherId, setTeacherId] = useState<number | ''>('')
  const [category, setCategory] = useState<LoanCategory>(loan?.category ?? 'libro')
  const [itemName, setItemName] = useState(loan?.item_name ?? '')
  const [quantity, setQuantity] = useState(String(loan?.quantity ?? 1))
  const [itemCode, setItemCode] = useState(loan?.item_code ?? '')
  const [loanDate, setLoanDate] = useState(loan?.loan_date.slice(0, 10) ?? localDateString())
  const [dueDate, setDueDate] = useState(loan?.due_date.slice(0, 10) ?? daysFromNow(7))
  const [notes, setNotes] = useState(loan?.notes ?? '')
  const [saving, setSaving] = useState(false)

  const { data: groups } = useQuery({
    queryKey: ['groups', institution?.id],
    queryFn: () => institutionsApi.groups(institution!.id),
    enabled: !!institution && !borrowerFixed && borrowerType === 'student',
    staleTime: 3 * 60 * 1000,
  })
  const { data: students } = useQuery({
    queryKey: ['group-students', groupId],
    queryFn: () => groupsApi.students(groupId as number),
    enabled: !!groupId,
  })
  const { data: teachers } = useQuery({
    queryKey: ['resource-loans', 'teachers'],
    queryFn: loansApi.teachers,
    enabled: !borrowerFixed && borrowerType === 'teacher',
    staleTime: 3 * 60 * 1000,
  })

  const save = async () => {
    if (!itemName.trim()) {
      toast.error('Escribe qué se presta.')
      return
    }
    if (!isEdit && borrowerType === 'student' && !studentId) {
      toast.error('Elige el estudiante.')
      return
    }
    if (!isEdit && borrowerType === 'teacher' && !teacherId) {
      toast.error('Elige el docente.')
      return
    }
    if (dueDate < loanDate) {
      toast.error('La fecha de devolución no puede ser anterior a la del préstamo.')
      return
    }

    const payload = {
      category,
      item_name: itemName.trim(),
      quantity: Math.max(1, Number(quantity) || 1),
      item_code: itemCode.trim() || null,
      loan_date: loanDate,
      due_date: dueDate,
      notes: notes.trim() || null,
    }
    setSaving(true)
    try {
      if (loan) {
        await loansApi.update(loan.id, payload)
        toast.success('Préstamo actualizado.')
      } else {
        await loansApi.create({
          ...payload,
          student_id: borrowerType === 'student' ? (studentId as number) : null,
          borrower_user_id: borrowerType === 'teacher' ? (teacherId as number) : null,
        })
        toast.success('Préstamo registrado.')
      }
      invalidate()
      onOpenChange(false)
    } catch (error) {
      const data = axios.isAxiosError(error) ? error.response?.data : null
      toast.error((data?.errors ? (Object.values(data.errors)[0] as string[])[0] : data?.message) || 'No pudimos guardar el préstamo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Editar préstamo' : 'Nuevo préstamo'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {borrowerFixed ? (
            <p className="rounded-md bg-muted px-3 py-2 text-sm">
              Se presta a: <strong>{loan ? borrowerName(loan) : presetStudent?.name}</strong>
            </p>
          ) : (
            <>
              <div className="space-y-1">
                <Label>Se presta a</Label>
                <div className="flex gap-1">
                  {(['student', 'teacher'] as const).map((type) => (
                    <Button
                      key={type}
                      type="button"
                      size="sm"
                      variant={borrowerType === type ? 'default' : 'outline'}
                      onClick={() => setBorrowerType(type)}
                    >
                      {type === 'student' ? 'Estudiante' : 'Docente'}
                    </Button>
                  ))}
                </div>
              </div>
              {borrowerType === 'student' ? (
                <div className="grid grid-cols-[120px_1fr] gap-2">
                  <div className="space-y-1">
                    <Label>Grupo</Label>
                    <select
                      className="h-12 w-full rounded-md border border-input bg-transparent px-2"
                      value={groupId}
                      onChange={(e) => {
                        setGroupId(e.target.value ? Number(e.target.value) : '')
                        setStudentId('')
                      }}
                    >
                      <option value="">Elige...</option>
                      {groups?.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label>Estudiante</Label>
                    <SearchableSelect
                      value={studentId}
                      onChange={setStudentId}
                      disabled={!groupId}
                      placeholder={groupId ? 'Selecciona un estudiante' : 'Primero el grupo'}
                      options={(students ?? []).map((s) => ({ id: s.id, label: `${s.last_name} ${s.first_name}` }))}
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <Label>Docente</Label>
                  <SearchableSelect
                    value={teacherId}
                    onChange={setTeacherId}
                    placeholder="Selecciona un docente"
                    options={(teachers ?? []).map((t) => ({ id: t.id, label: t.name }))}
                  />
                </div>
              )}
            </>
          )}

          <div className="space-y-1">
            <Label>Tipo de recurso</Label>
            <div className="flex flex-wrap gap-1.5">
              {(Object.keys(LOAN_CATEGORIES) as LoanCategory[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCategory(key)}
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-sm',
                    category === key ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
                  )}
                >
                  {LOAN_CATEGORIES[key].icon} {LOAN_CATEGORIES[key].label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-[1fr_90px] gap-2">
            <div className="space-y-1">
              <Label>Recurso</Label>
              <Input
                placeholder={`Ej: ${LOAN_CATEGORIES[category].example}`}
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Cantidad</Label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Código o serial (opcional)</Label>
            <Input placeholder="Ej: placa 0457" value={itemCode} onChange={(e) => setItemCode(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label>Fecha del préstamo</Label>
              <Input type="date" max={localDateString()} value={loanDate} onChange={(e) => setLoanDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Debe devolverlo el</Label>
              <Input type="date" min={loanDate} value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          {!isEdit && (
            <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              Devolución:
              {[
                ['Hoy', 0],
                ['Mañana', 1],
                ['En 1 semana', 7],
                ['En 15 días', 15],
                ['En 1 mes', 30],
              ].map(([label, days]) => (
                <button
                  key={label}
                  type="button"
                  className="rounded-full border px-2 py-0.5 hover:bg-muted"
                  onClick={() => setDueDate(daysFromNow(days as number))}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <Label>Observaciones (opcional)</Label>
            <Input placeholder="Estado en que se entrega, accesorios…" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : isEdit ? 'Guardar cambios' : 'Registrar préstamo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** Registrar la devolución (con su estado) o marcar el recurso como perdido. */
export function ReturnLoanDialog({
  open,
  onOpenChange,
  loan,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  loan: ResourceLoan
}) {
  const invalidate = useInvalidateLoans()
  const [returnedAt, setReturnedAt] = useState(localDateString())
  const [condition, setCondition] = useState<'bueno' | 'danado' | 'incompleto'>('bueno')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (status: 'devuelto' | 'perdido') => {
    if (status === 'perdido' && !window.confirm(`¿Marcar "${loan.item_name}" como perdido? Dejará de aparecer como pendiente.`)) return
    setSaving(true)
    try {
      await loansApi.markReturned(loan.id, {
        status,
        returned_at: status === 'devuelto' ? returnedAt : undefined,
        return_condition: status === 'devuelto' ? condition : undefined,
        return_notes: notes.trim() || undefined,
      })
      toast.success(status === 'devuelto' ? 'Devolución registrada.' : 'Marcado como perdido.')
      invalidate()
      onOpenChange(false)
    } catch {
      toast.error('No pudimos registrar la devolución.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar devolución</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {loan.quantity > 1 ? `${loan.quantity} × ` : ''}
          {loan.item_name} — {borrowerName(loan)}
        </p>
        <div className="flex flex-col gap-3">
          <div className="space-y-1">
            <Label>Fecha de devolución</Label>
            <Input type="date" max={localDateString()} value={returnedAt} onChange={(e) => setReturnedAt(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>¿Cómo lo devolvió?</Label>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ['bueno', 'En buen estado'],
                  ['danado', 'Dañado'],
                  ['incompleto', 'Incompleto'],
                ] as const
              ).map(([value, label]) => (
                <Button
                  key={value}
                  type="button"
                  size="sm"
                  variant={condition === value ? 'default' : 'outline'}
                  onClick={() => setCondition(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-1">
            <Label>Observaciones (opcional)</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" className="text-destructive" onClick={() => submit('perdido')} disabled={saving}>
            No lo va a devolver (perdido)
          </Button>
          <Button onClick={() => submit('devuelto')} disabled={saving}>
            {saving ? 'Guardando...' : 'Registrar devolución'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
