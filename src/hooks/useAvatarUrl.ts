import { useQuery } from '@tanstack/react-query'

import { api } from '@/services/api/client'
import { useAuthStore } from '@/store/authStore'

/**
 * URL local (blob) de la foto de perfil del usuario. El archivo está en disco
 * privado y se pide con el token; la clave incluye la ruta, así una foto nueva se
 * vuelve a pedir sola.
 */
export function useAvatarUrl() {
  const avatar = useAuthStore((s) => s.user?.avatar)
  const { data: url } = useQuery({
    queryKey: ['avatar', avatar],
    queryFn: () => api.get('/auth/avatar', { responseType: 'blob' }).then((r) => URL.createObjectURL(r.data)),
    enabled: !!avatar,
    staleTime: Infinity,
  })

  // El blob no se libera al desmontar: la misma URL (en caché) la usan a la vez el
  // encabezado y Perfil, y liberarla desde uno rompería la imagen del otro.
  return avatar ? url : undefined
}
