import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { parentsApi } from '@/services/api/parents'
import { RELATIONSHIP_LABELS } from '@/types/parents'
import type { ParentGuardian, ParentRelationship } from '@/types/parents'

/** Agregar un acudiente al estudiante, o con `parent` editar sus datos. */
export function ParentDialog({
  open,
  onOpenChange,
  studentId,
  parent,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  studentId: number
  parent?: ParentGuardian
}) {
  const queryClient = useQueryClient()
  const [firstName, setFirstName] = useState(parent?.first_name ?? '')
  const [lastName, setLastName] = useState(parent?.last_name ?? '')
  const [relationship, setRelationship] = useState<ParentRelationship>(parent?.relationship ?? 'madre')
  const [phone, setPhone] = useState(parent?.phone ?? '')
  const [phoneAlt, setPhoneAlt] = useState(parent?.phone_alt ?? '')
  const [email, setEmail] = useState(parent?.email ?? '')
  const [isPrimary, setIsPrimary] = useState(false)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      toast.error('Completa nombre, apellido y teléfono.')
      return
    }
    const payload = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      relationship,
      phone: phone.trim(),
      phone_alt: phoneAlt.trim() || undefined,
      email: email.trim() || undefined,
    }
    setSaving(true)
    try {
      if (parent) {
        await parentsApi.update(parent.id, payload)
        toast.success('Acudiente actualizado.')
      } else {
        await parentsApi.create({ student_id: studentId, ...payload, is_primary: isPrimary })
        toast.success('Acudiente agregado.')
      }
      queryClient.invalidateQueries({ queryKey: ['student-profile', studentId] })
      queryClient.invalidateQueries({ queryKey: ['parents', studentId] })
      onOpenChange(false)
    } catch (error) {
      const message =
        (axios.isAxiosError(error) && (error.response?.data?.errors?.email?.[0] || error.response?.data?.message)) ||
        'No pudimos guardar el acudiente.'
      toast.error(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{parent ? 'Editar acudiente' : 'Agregar acudiente'}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Nombre</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Apellido</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Parentesco</Label>
            <select
              className="h-12 w-full rounded-md border border-input bg-transparent px-3"
              value={relationship}
              onChange={(e) => setRelationship(e.target.value as ParentRelationship)}
            >
              {Object.entries(RELATIONSHIP_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Teléfono</Label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Otro teléfono (opcional)</Label>
              <Input type="tel" value={phoneAlt} onChange={(e) => setPhoneAlt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Correo (opcional)</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {!parent && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
              Es el contacto principal
            </label>
          )}
        </div>
        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Guardando...' : parent ? 'Guardar cambios' : 'Agregar acudiente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
