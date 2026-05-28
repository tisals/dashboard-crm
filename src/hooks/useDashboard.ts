import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '../api/crmApi'
import type { DashboardData } from '../api/types'

export function useDashboard() {
  const query = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    staleTime: 300000, // 5 min
    refetchInterval: 60000, // 60s polling
    retry: 2,
  })

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    refetch: query.refetch,
  }
}
