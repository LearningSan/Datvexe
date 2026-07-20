import { useQuery } from "@tanstack/react-query";

import {
  getTripCheckinPassengersApi,
  getUpcomingCheckinTripsApi,
} from "@/services/admin/checkin/checkin-query.service";

import type { TripPassengerFilter } from "@/types/admin/checkin/checkin-operation.type";

export const adminCheckinQueryKeys = {
  root: ["admin", "checkins"] as const,

  upcomingTrips: (hours: number, limit: number) =>
    [...adminCheckinQueryKeys.root, "upcoming-trips", hours, limit] as const,

  tripPassengers: (
    tripId: number,
    filter: TripPassengerFilter,
    keyword: string,
  ) =>
    [
      ...adminCheckinQueryKeys.root,
      "trip-passengers",
      tripId,
      filter,
      keyword,
    ] as const,
};

export function useUpcomingCheckinTrips(hours = 24, limit = 30) {
  return useQuery({
    queryKey: adminCheckinQueryKeys.upcomingTrips(hours, limit),

    queryFn: () =>
      getUpcomingCheckinTripsApi({
        hours,
        limit,
      }),

    staleTime: 15 * 1000,

    gcTime: 5 * 60 * 1000,

    refetchInterval: 30 * 1000,

    refetchIntervalInBackground: true,

    refetchOnWindowFocus: true,

    retry: 1,
  });
}

export function useTripCheckinPassengers(
  tripId: number | null,
  filter: TripPassengerFilter,
  keyword: string,
) {
  return useQuery({
    queryKey: adminCheckinQueryKeys.tripPassengers(
      tripId ?? 0,
      filter,
      keyword,
    ),

    queryFn: () =>
      getTripCheckinPassengersApi({
        tripId: tripId as number,

        filter,
        keyword,
      }),

    enabled: typeof tripId === "number" && tripId > 0,

    staleTime: 10 * 1000,

    gcTime: 5 * 60 * 1000,

    /*
     * Danh sách tự cập nhật vì thời gian cảnh báo
     * thay đổi liên tục.
     */
    refetchInterval: 20 * 1000,

    refetchIntervalInBackground: true,

    refetchOnWindowFocus: true,

    retry: 1,
  });
}
