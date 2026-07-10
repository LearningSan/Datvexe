import { useQuery } from "@tanstack/react-query";
import { fetchDashboardData } from "@/services/admin/dashboard.service";

export function useDashboard(fromDate: string, toDate: string) {
  return useQuery({
    queryKey: ["admin-dashboard", fromDate, toDate],
    queryFn: () => fetchDashboardData(fromDate, toDate),
    enabled: !!fromDate && !!toDate,
    staleTime: 1000 * 60,
    retry: 1,
  });
}
