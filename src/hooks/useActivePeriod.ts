import { useQuery } from '@tanstack/react-query'

import { periodsApi } from '@/services/api/periods'

export function useActivePeriod(academicYearId: number | undefined) {
  const query = useQuery({
    queryKey: ['periods', academicYearId],
    queryFn: () => periodsApi.list(academicYearId as number),
    enabled: !!academicYearId,
  })

  const activePeriod = query.data?.find((p) => p.is_active) ?? query.data?.[0]

  return { ...query, activePeriod }
}
