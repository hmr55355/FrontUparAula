import { useQuery } from '@tanstack/react-query'

import { institutionsApi } from '@/services/api/institutions'
import { useAuthStore } from '@/store/authStore'

export function useCurrentInstitution() {
  const token = useAuthStore((s) => s.token)

  return useQuery({
    queryKey: ['institutions', 'current'],
    queryFn: institutionsApi.current,
    enabled: !!token,
    retry: false,
  })
}
