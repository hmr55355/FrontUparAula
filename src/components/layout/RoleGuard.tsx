import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'
import { useEffectiveRole } from '@/hooks/useEffectiveRole'
import { useViewModeStore } from '@/store/viewModeStore'
import type { InstitutionRole } from '@/types'

interface RoleGuardProps {
  allow: InstitutionRole[]
  children: ReactNode
}

/**
 * Gates a route by the teacher's *effective* role within their active
 * institution: el rol real resuelto server-side, salvo que un admin haya
 * cambiado su vista a "Docente" (viewModeStore), en cuyo caso se trata como
 * docente también para efectos de esta ruta.
 */
export function RoleGuard({ allow, children }: RoleGuardProps) {
  const { data: institution, isLoading } = useCurrentInstitution()
  const effectiveRole = useEffectiveRole()
  const setViewMode = useViewModeStore((s) => s.setViewMode)

  if (isLoading) {
    return null
  }

  if (!effectiveRole || !allow.includes(effectiveRole)) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
        <h2 className="text-xl font-semibold">No tienes acceso a esta sección</h2>
        <p className="text-muted-foreground">Esta página es solo para administradores de la institución.</p>
        {institution?.my_role === 'admin' && (
          <Button className="mt-2" onClick={() => setViewMode('admin')}>
            Cambiar a vista Administrador
          </Button>
        )}
      </div>
    )
  }

  return <>{children}</>
}
