import type { ReactNode } from 'react'

import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'
import type { InstitutionRole } from '@/types'

interface RoleGuardProps {
  allow: InstitutionRole[]
  children: ReactNode
}

/**
 * Gates a route by the teacher's role within their active institution
 * (admin vs teacher, resolved via institution_teachers server-side).
 */
export function RoleGuard({ allow, children }: RoleGuardProps) {
  const { data: institution, isLoading } = useCurrentInstitution()

  if (isLoading) {
    return null
  }

  if (!institution || !institution.my_role || !allow.includes(institution.my_role)) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
        <h2 className="text-xl font-semibold">No tienes acceso a esta sección</h2>
        <p className="text-muted-foreground">Esta página es solo para administradores de la institución.</p>
      </div>
    )
  }

  return <>{children}</>
}
