import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'
import { Coffee, Plus, Trash2, Wand2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { academicStructureApi } from '@/services/api/academicStructure'
import type { ClassBlock, Shift } from '@/types'

export function shiftsQueryKey(institutionId: number) {
  return ['shifts', institutionId] as const
}

function errorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) return fallback
  const errors = error.response?.data?.errors as Record<string, string[]> | undefined
  return (errors && Object.values(errors)[0]?.[0]) || error.response?.data?.message || fallback
}

/** Jornadas: cada una con sus grupos y su propio horario de bloques y descansos. */
export function ShiftsPanel({ institutionId }: { institutionId: number }) {
  const queryClient = useQueryClient()
  const [newName, setNewName] = useState('')

  const { data: shifts } = useQuery({
    queryKey: shiftsQueryKey(institutionId),
    queryFn: () => academicStructureApi.shifts(institutionId),
    staleTime: 3 * 60 * 1000,
  })

  const create = useMutation({
    mutationFn: () => academicStructureApi.createShift(institutionId, newName.trim()),
    onSuccess: () => {
      toast.success('Jornada creada.')
      setNewName('')
      queryClient.invalidateQueries({ queryKey: shiftsQueryKey(institutionId) })
    },
    onError: (error) => toast.error(errorMessage(error, 'No pudimos crear la jornada.')),
  })

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Jornadas</CardTitle>
          <CardDescription>
            Cada jornada tiene sus propios grupos (y sus listas) y su propio horario de bloques. Las materias, los
            docentes y el año escolar se comparten.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Input
            placeholder="Nueva jornada (ej. Tarde)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={() => create.mutate()} disabled={!newName.trim() || create.isPending}>
            Agregar jornada
          </Button>
        </CardContent>
      </Card>

      {shifts?.map((shift) => (
        <ShiftCard key={shift.id} shift={shift} institutionId={institutionId} canDelete={shifts.length > 1} />
      ))}
    </div>
  )
}

function ShiftCard({ shift, institutionId, canDelete }: { shift: Shift; institutionId: number; canDelete: boolean }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(shift.name)
  const [blocks, setBlocks] = useState<ClassBlock[]>(() =>
    (shift.class_blocks ?? []).map((b) => ({ ...b, start_time: b.start_time.slice(0, 5), end_time: b.end_time.slice(0, 5) }))
  )
  const [dirty, setDirty] = useState(false)

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: shiftsQueryKey(institutionId) })
    queryClient.invalidateQueries({ queryKey: ['schedule'] })
  }

  const rename = useMutation({
    mutationFn: () => academicStructureApi.renameShift(shift.id, name.trim()),
    onSuccess: () => {
      toast.success('Jornada renombrada.')
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error, 'No pudimos renombrar la jornada.')),
  })

  const remove = useMutation({
    mutationFn: () => academicStructureApi.deleteShift(shift.id),
    onSuccess: () => {
      toast.success('Jornada eliminada.')
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error, 'No pudimos eliminar la jornada.')),
  })

  const save = useMutation({
    mutationFn: () => academicStructureApi.saveBlocks(shift.id, blocks),
    onSuccess: () => {
      toast.success('Bloques guardados.')
      setDirty(false)
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error, 'No pudimos guardar los bloques.')),
  })

  const infer = async () => {
    try {
      const proposal = await academicStructureApi.inferBlocks(shift.id)
      if (proposal.length === 0) {
        toast.error('Esta jornada aún no tiene clases en el horario para proponer bloques.')
        return
      }
      setBlocks(proposal)
      setDirty(true)
      toast.success('Propuesta lista: revísala y guarda.')
    } catch {
      toast.error('No pudimos proponer bloques.')
    }
  }

  const update = (index: number, patch: Partial<ClassBlock>) => {
    setBlocks((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)))
    setDirty(true)
  }

  const add = (type: ClassBlock['type']) => {
    setBlocks((prev) => {
      const last = prev[prev.length - 1]
      const start = last?.end_time ?? '07:00'
      const [h, m] = start.split(':').map(Number)
      const minutes = h * 60 + m + (type === 'clase' ? 55 : 30)
      const end = `${String(Math.floor(minutes / 60) % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
      const nextNumber = prev.filter((b) => b.type === 'clase').length + 1
      return [...prev, { type, label: type === 'clase' ? String(nextNumber) : 'Descanso', start_time: start, end_time: end }]
    })
    setDirty(true)
  }

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center gap-2 space-y-0">
        <Input value={name} onChange={(e) => setName(e.target.value)} className="h-10 max-w-xs font-semibold" />
        {name.trim() !== shift.name && (
          <Button size="sm" variant="outline" onClick={() => rename.mutate()} disabled={!name.trim() || rename.isPending}>
            Renombrar
          </Button>
        )}
        <span className="text-sm text-muted-foreground">{shift.groups_count ?? 0} grupos</span>
        <Button
          size="sm"
          variant="ghost"
          className="ml-auto text-destructive"
          disabled={!canDelete || !!shift.groups_count || remove.isPending}
          title={shift.groups_count ? 'Tiene grupos: muévelos antes de eliminarla' : undefined}
          onClick={() => remove.mutate()}
        >
          <Trash2 className="h-4 w-4" /> Eliminar
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <p className="text-xs font-semibold uppercase text-muted-foreground">Bloques de la jornada</p>
        {blocks.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Sin bloques. Agrégalos (hora de clase o descanso) o propónlos a partir del horario ya cargado.
          </p>
        )}
        <div className="flex flex-col gap-2">
          {blocks.map((block, index) => (
            <div
              key={index}
              className={`flex flex-wrap items-center gap-2 rounded-md border p-2 ${block.type === 'descanso' ? 'bg-muted/50' : ''}`}
            >
              {block.type === 'descanso' && <Coffee className="h-4 w-4 text-muted-foreground" />}
              <Input
                value={block.label}
                onChange={(e) => update(index, { label: e.target.value })}
                className="h-9 w-28"
                aria-label="Nombre del bloque"
              />
              <Input
                type="time"
                value={block.start_time}
                onChange={(e) => update(index, { start_time: e.target.value })}
                className="h-9 w-32"
                aria-label="Inicio"
              />
              <span className="text-muted-foreground">–</span>
              <Input
                type="time"
                value={block.end_time}
                onChange={(e) => update(index, { end_time: e.target.value })}
                className="h-9 w-32"
                aria-label="Fin"
              />
              <select
                className="h-9 rounded-md border border-input bg-transparent px-2 text-sm"
                value={block.type}
                onChange={(e) => update(index, { type: e.target.value as ClassBlock['type'] })}
              >
                <option value="clase">Clase</option>
                <option value="descanso">Descanso</option>
              </select>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => {
                  setBlocks((prev) => prev.filter((_, i) => i !== index))
                  setDirty(true)
                }}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => add('clase')}>
            <Plus className="h-4 w-4" /> Hora de clase
          </Button>
          <Button size="sm" variant="outline" onClick={() => add('descanso')}>
            <Coffee className="h-4 w-4" /> Descanso
          </Button>
          <Button size="sm" variant="ghost" onClick={infer}>
            <Wand2 className="h-4 w-4" /> Proponer desde el horario actual
          </Button>
          <Button size="sm" className="ml-auto" onClick={() => save.mutate()} disabled={!dirty || save.isPending}>
            {save.isPending ? 'Guardando...' : 'Guardar bloques'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
