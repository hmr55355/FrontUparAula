import type { ReactNode } from 'react'

import { Button } from '@/components/ui/button'
import { useEffectiveRole } from '@/hooks/useEffectiveRole'
import { useViewModeStore } from '@/store/viewModeStore'

/**
 * Contraparte de RoleGuard para los módulos del aula: en la vista
 * "Administrador" no se muestran (ni por menú ni entrando por URL). Solo un
 * admin real puede estar en esa vista, así que se le ofrece cambiar a "Docente".
 */
export function TeacherViewGuard({ children }: { children: ReactNode }) {
  const effectiveRole = useEffectiveRole()
  const setViewMode = useViewModeStore((s) => s.setViewMode)

  if (effectiveRole === 'admin') {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
        <h2 className="text-xl font-semibold">Esta sección es de la vista Docente</h2>
        <p className="text-muted-foreground">Estás en la vista Administrador. Cámbiate a Docente para trabajar con tus cursos.</p>
        <Button onClick={() => setViewMode('teacher')}>Cambiar a vista Docente</Button>
      </div>
    )
  }

  return <>{children}</>
}
