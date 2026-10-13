import { useQueryClient } from '@tanstack/react-query'

/** Invalida todo lo que muestra préstamos (lista, alertas y perfiles). */
export function useInvalidateLoans() {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['resource-loans'] })
    queryClient.invalidateQueries({ queryKey: ['student-profile'] })
  }
}
