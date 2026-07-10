import { useQuery } from "@tanstack/react-query";
import { fetchRoutePerformance } from "@/services/admin/dashboard.service";

export function useRoutePerformance(params: {
  originCityId: number | null;
  destinationCityId: number | null;
  fromDate: string;
  toDate: string;
}) {
  return useQuery({
    queryKey: [
      "route-performance",
      params.originCityId,
      params.destinationCityId,
      params.fromDate,
      params.toDate,
    ],
    queryFn: () =>
      fetchRoutePerformance({
        originCityId: params.originCityId!,
        destinationCityId: params.destinationCityId!,
        fromDate: params.fromDate,
        toDate: params.toDate,
      }),
    enabled:
      !!params.originCityId &&
      !!params.destinationCityId &&
      params.originCityId !== params.destinationCityId &&
      !!params.fromDate &&
      !!params.toDate,

    staleTime: 1000 * 60,
    retry: 1,
  });
}
