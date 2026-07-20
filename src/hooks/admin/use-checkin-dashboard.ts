import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";

import {
  getCheckinDashboardPassengers,
  getCheckinDashboardSummary,
  getCheckinDashboardTrips,
  updatePassengerCheckin,
  updatePassengerContact,
  type GetDashboardPassengersParams,
  type GetDashboardTripsParams,
} from "@/services/admin/checkin/checkin-dashboard.service";

interface DashboardQueryOptions {
  refetchInterval?: number | false;
}

export const checkinDashboardKeys = {
  all: ["admin", "checkins", "dashboard"] as const,

  summary: () => [...checkinDashboardKeys.all, "summary"] as const,

  trips: (params: GetDashboardTripsParams) =>
    [...checkinDashboardKeys.all, "trips", params] as const,

  passengers: (params: GetDashboardPassengersParams) =>
    [...checkinDashboardKeys.all, "passengers", params] as const,
};

export function useCheckinDashboardSummary(
  options: DashboardQueryOptions = {},
) {
  return useQuery({
    queryKey: checkinDashboardKeys.summary(),
    queryFn: getCheckinDashboardSummary,

    staleTime: 5_000,
    gcTime: 5 * 60_000,

    refetchInterval: options.refetchInterval ?? false,

    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,

    retry: 1,
  });
}

export function useCheckinDashboardTrips(
  params: GetDashboardTripsParams,
  options: DashboardQueryOptions = {},
) {
  return useQuery({
    queryKey: checkinDashboardKeys.trips(params),

    queryFn: () => getCheckinDashboardTrips(params),

    staleTime: 5_000,
    gcTime: 5 * 60_000,

    refetchInterval: options.refetchInterval ?? false,

    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,

    retry: 1,
  });
}

export function useCheckinDashboardPassengers(
  params: GetDashboardPassengersParams,
  options: DashboardQueryOptions = {},
) {
  return useQuery({
    queryKey: checkinDashboardKeys.passengers(params),

    queryFn: () => getCheckinDashboardPassengers(params),

    enabled: params.tripId > 0,

    staleTime: 5_000,
    gcTime: 5 * 60_000,

    refetchInterval:
      params.tripId > 0 ? (options.refetchInterval ?? false) : false,

    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,

    retry: 1,
  });
}

async function invalidateCheckinDashboard(queryClient: QueryClient) {
  await queryClient.invalidateQueries({
    queryKey: checkinDashboardKeys.all,
  });
}

export function useUpdatePassengerCheckin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePassengerCheckin,

    onSuccess: () => invalidateCheckinDashboard(queryClient),
  });
}

export function useUpdatePassengerContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updatePassengerContact,

    onSuccess: () => invalidateCheckinDashboard(queryClient),
  });
}
