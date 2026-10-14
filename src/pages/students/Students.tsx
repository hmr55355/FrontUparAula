import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'

import { Card, CardContent } from '@/components/ui/card'
import { groupsApi } from '@/services/api/groups'
import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'
import { GroupRoster } from '@/pages/institution/GroupRosterDialog'
import { cn } from '@/lib/utils'

/**
 * Estudiantes por grupo: matricular, editar, trasladar, retirar y volver a
 * matricular. El administrador ve todos los grupos; un docente, los que dirige o
 * donde dicta, y solo puede hacer cambios si la institución lo habilitó.
 */
export function Students() {
  const { data: institution } = useCurrentInstitution()
  const { data: groups, isLoading } = useQuery({ queryKey: ['groups', 'mine'], queryFn: groupsApi.mine })
  const [groupId, setGroupId] = useState<number | null>(null)

  useEffect(() => {
    if (groups?.length && !groups.some((g) => g.id === groupId)) {
      setGroupId((groups.find((g) => g.is_director) ?? groups[0]).id)
    }
  }, [groups, groupId])

  const group = groups?.find((g) => g.id === groupId)
  const isAdmin = institution?.my_role === 'admin'

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold">Estudiantes</h1>
        <p className="text-sm text-muted-foreground">
          Matricula, traslada o retira estudiantes: los retirados y trasladados quedan con su fecha y motivo, y dejan de
          salir en las listas de clase. La papelera elimina del todo y es solo para registros hechos por error.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Cargando grupos...</p>}
      {groups?.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No tienes grupos este año. Pídele al administrador que te asigne cursos o una dirección de grupo.
          </CardContent>
        </Card>
      )}

      {!!groups?.length && (
        <div className="flex flex-wrap gap-1.5">
          {groups.map((g) => (
            <button
              key={g.id}
              onClick={() => setGroupId(g.id)}
              className={cn(
                'rounded-full border px-3 py-1 text-sm',
                g.id === groupId ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted'
              )}
            >
              {g.name}
              {g.is_director && ' ★'}
              <span className="ml-1 text-xs opacity-70">{g.student_count}</span>
            </button>
          ))}
        </div>
      )}

      {group && (
        <Card>
          <CardContent className="flex flex-col gap-3 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-base font-semibold">Grupo {group.name}</h2>
              <span className="text-xs text-muted-foreground">
                Director(a) de grupo: {group.director?.name ?? 'sin asignar'}
              </span>
            </div>
            {group.can_manage_students ? (
              <GroupRoster key={group.id} group={group} groups={groups ?? []} />
            ) : (
              <ReadOnlyRoster groupId={group.id} isAdmin={isAdmin} />
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

/** Docente sin permiso de gestión: ve la lista, pero los cambios los hace el administrador. */
function ReadOnlyRoster({ groupId, isAdmin }: { groupId: number; isAdmin: boolean }) {
  const { data: students } = useQuery({
    queryKey: ['group-students', groupId],
    queryFn: () => groupsApi.students(groupId),
  })

  return (
    <>
      {!isAdmin && (
        <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
          En tu institución solo el administrador matricula, traslada o retira estudiantes. Si alguien se retiró o
          cambió de grupo, avísale; él también puede habilitar esta función para los docentes (Institución → Grupos).
        </p>
      )}
      <div className="flex flex-col gap-1">
        {students?.map((s) => (
          <Link key={s.id} to={`/student/${s.id}`} className="rounded-md border px-3 py-2 text-sm hover:bg-muted/50">
            {s.last_name} {s.first_name}
          </Link>
        ))}
      </div>
    </>
  )
}
