import { useCurrentInstitution } from '@/hooks/useCurrentInstitution'
import { useViewModeStore } from '@/store/viewModeStore'
import type { InstitutionRole } from '@/types'

/**
 * El rol real (institution_teachers.role) siempre manda en el backend — esto
 * solo resuelve qué superficie admin mostrar en el cliente. Un admin que
 * cambió su vista a "Docente" ve el rol efectivo 'teacher'; un docente real
 * nunca se ve afectado por este store (no tiene el control para cambiarlo).
 */
export function useEffectiveRole(): InstitutionRole | undefined {
  const { data: institution } = useCurrentInstitution()
  const viewMode = useViewModeStore((s) => s.viewMode)

  if (!institution?.my_role) return undefined

  return institution.my_role === 'admin' && viewMode === 'teacher' ? 'teacher' : institution.my_role
}
