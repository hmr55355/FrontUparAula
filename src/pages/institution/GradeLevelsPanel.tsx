import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'
import { Trash2 } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { academicStructureApi, STANDARD_GRADE_LEVELS } from '@/services/api/academicStructure'

export function gradeLevelsQueryKey(institutionId: number) {
  return ['grade-levels', institutionId] as const
}

/** Grados de la institución: a ellos pertenecen los grupos y se vinculan las materias. */
export function GradeLevelsPanel({ institutionId }: { institutionId: number }) {
  const queryClient = useQueryClient()
  const [standardLevel, setStandardLevel] = useState<string>('')
  const [customName, setCustomName] = useState('')

  const { data: gradeLevels } = useQuery({
    queryKey: gradeLevelsQueryKey(institutionId),
    queryFn: () => academicStructureApi.gradeLevels(institutionId),
    staleTime: 3 * 60 * 1000,
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: gradeLevelsQueryKey(institutionId) })
    queryClient.invalidateQueries({ queryKey: ['institutions', institutionId, 'assignment-grid'] })
  }

  const errorMessage = (error: unknown, fallback: string) =>
    (axios.isAxiosError(error) && (error.response?.data?.errors?.name?.[0] || error.response?.data?.message)) || fallback

  const create = useMutation({
    mutationFn: (payload: { name: string; level: number | null }) =>
      academicStructureApi.createGradeLevel(institutionId, payload),
    onSuccess: () => {
      toast.success('Grado creado.')
      setStandardLevel('')
      setCustomName('')
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error, 'No pudimos crear el grado.')),
  })

  const remove = useMutation({
    mutationFn: (id: number) => academicStructureApi.deleteGradeLevel(id),
    onSuccess: () => {
      toast.success('Grado eliminado.')
      invalidate()
    },
    onError: (error) => toast.error(errorMessage(error, 'No pudimos eliminar el grado.')),
  })

  const existingNames = new Set(gradeLevels?.map((g) => g.name))
  const standardOptions = STANDARD_GRADE_LEVELS.filter((g) => !existingNames.has(g.name))

  const addStandard = () => {
    const option = STANDARD_GRADE_LEVELS.find((g) => String(g.level) === standardLevel)
    if (option) create.mutate({ name: option.name, level: option.level })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Grados</CardTitle>
        <CardDescription>
          Cada grupo pertenece a un grado (ej. 1001 → Décimo) y cada materia se vincula a los grados donde se dicta.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="standard-grade">Grado</Label>
            <select
              id="standard-grade"
              className="h-10 rounded-md border border-input bg-transparent px-2 text-sm"
              value={standardLevel}
              onChange={(e) => setStandardLevel(e.target.value)}
            >
              <option value="">Selecciona...</option>
              {standardOptions.map((g) => (
                <option key={g.level} value={g.level}>
                  {g.name} ({g.level === 0 ? 'Transición' : `${g.level}°`})
                </option>
              ))}
            </select>
          </div>
          <Button size="sm" onClick={addStandard} disabled={!standardLevel || create.isPending}>
            Agregar grado
          </Button>
          <span className="px-2 text-sm text-muted-foreground">o</span>
          <div className="space-y-1">
            <Label htmlFor="custom-grade">Otro nombre</Label>
            <Input
              id="custom-grade"
              placeholder="Ej. Ciclo V"
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="h-10"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => create.mutate({ name: customName.trim(), level: null })}
            disabled={!customName.trim() || create.isPending}
          >
            Agregar
          </Button>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Grado</TableHead>
              <TableHead>Grupos</TableHead>
              <TableHead>Materias vinculadas</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {gradeLevels?.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground">
                  Aún no hay grados. Agrega los grados que tiene tu institución.
                </TableCell>
              </TableRow>
            )}
            {gradeLevels?.map((g) => (
              <TableRow key={g.id}>
                <TableCell className="font-medium">{g.name}</TableCell>
                <TableCell>{g.groups_count ?? 0}</TableCell>
                <TableCell>{g.subject_ids?.length ?? 0}</TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="icon"
                    title={g.groups_count ? 'Tiene grupos: muévelos antes de eliminarlo' : 'Eliminar grado'}
                    disabled={!!g.groups_count || remove.isPending}
                    onClick={() => remove.mutate(g.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
