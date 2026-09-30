import { useState } from 'react'
import { toast } from 'sonner'
import axios from 'axios'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { studentsApi } from '@/services/api/students'
import { localDateString } from '@/utils/dateHelpers'
import { DOCUMENT_TYPE_LABELS } from '@/types/students'
import type { DocumentType, Gender, Student } from '@/types/students'

/**
 * Crear un estudiante (con `groupId`: queda matriculado en ese grupo) o editar sus
 * datos (con `student`). Solo administradores; el backend lo exige.
 */
export function StudentFormDialog({
  open,
  onOpenChange,
  student,
  groupId,
  groupName,
  onSaved,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  student?: Student
  groupId?: number
  groupName?: string
  onSaved: () => void
}) {
  const [form, setForm] = useState({
    first_name: student?.first_name ?? '',
    last_name: student?.last_name ?? '',
    document_type: (student?.document_type ?? 'TI') as DocumentType,
    document_number: student?.document_number ?? '',
    birthdate: student?.birthdate?.slice(0, 10) ?? '',
    gender: (student?.gender ?? '') as Gender | '',
    phone: student?.phone ?? '',
    email: student?.email ?? '',
    address: student?.address ?? '',
  })
  const [enrollmentDate, setEnrollmentDate] = useState(localDateString())
  const [saving, setSaving] = useState(false)
  const set = (changes: Partial<typeof form>) => setForm((f) => ({ ...f, ...changes }))

  const save = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) {
      toast.error('Escribe nombres y apellidos.')
      return
    }
    const payload = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      document_type: form.document_type,
      document_number: form.document_number.trim() || null,
      birthdate: form.birthdate || null,
      gender: form.gender || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      address: form.address.trim() || null,
    }
    setSaving(true)
    try {
      if (student) {
        await studentsApi.update(student.id, payload)
        toast.success('Datos del estudiante actualizados.')
      } else if (groupId) {
        await studentsApi.create({ ...payload, group_id: groupId, enrollment_date: enrollmentDate })
        toast.success(`Estudiante matriculado en ${groupName ?? 'el grupo'}.`)
      }
      onSaved()
      onOpenChange(false)
    } catch (error) {
      const data = axios.isAxiosError(error) ? error.response?.data : null
      const first = data?.errors ? (Object.values(data.errors)[0] as string[])[0] : data?.message
      toast.error(first || 'No pudimos guardar el estudiante.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{student ? 'Editar estudiante' : `Nuevo estudiante${groupName ? ` en ${groupName}` : ''}`}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Apellidos</Label>
              <Input value={form.last_name} onChange={(e) => set({ last_name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Nombres</Label>
              <Input value={form.first_name} onChange={(e) => set({ first_name: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-[1fr_1fr] gap-3">
            <div className="space-y-1">
              <Label>Tipo de documento</Label>
              <select
                className="h-12 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.document_type}
                onChange={(e) => set({ document_type: e.target.value as DocumentType })}
              >
                {Object.entries(DOCUMENT_TYPE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {value} — {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label>Número</Label>
              <Input inputMode="numeric" value={form.document_number} onChange={(e) => set({ document_number: e.target.value })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Fecha de nacimiento</Label>
              <Input type="date" max={localDateString()} value={form.birthdate} onChange={(e) => set({ birthdate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Sexo</Label>
              <select
                className="h-12 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                value={form.gender}
                onChange={(e) => set({ gender: e.target.value as Gender | '' })}
              >
                <option value="">Sin especificar</option>
                <option value="femenino">Femenino</option>
                <option value="masculino">Masculino</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Teléfono (opcional)</Label>
              <Input type="tel" value={form.phone} onChange={(e) => set({ phone: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Correo (opcional)</Label>
              <Input type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Dirección (opcional)</Label>
            <Input value={form.address} onChange={(e) => set({ address: e.target.value })} />
          </div>
          {!student && (
            <div className="space-y-1">
              <Label>Fecha de matrícula</Label>
              <Input type="date" value={enrollmentDate} onChange={(e) => setEnrollmentDate(e.target.value)} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : student ? 'Guardar cambios' : 'Matricular estudiante'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
