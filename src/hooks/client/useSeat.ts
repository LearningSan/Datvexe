import { useQuery } from "@tanstack/react-query";

import { fetchTripSeats } from "@/services/client/seat.service";

import type { TripSeatResponse } from "@/types/client/seat/seat-response.type";

export function useTripSeats(tripId: number, initialData?: TripSeatResponse) {
  return useQuery<TripSeatResponse>({
    queryKey: ["trip-seats", tripId],

    queryFn: () => fetchTripSeats(tripId),

    enabled: Number.isFinite(tripId) && tripId > 0,

    initialData,

    meta: {
      globalLoading: false,
    },

    staleTime: 1000 * 30,
    gcTime: 1000 * 60 * 10,

    refetchInterval: 1000 * 60,
    refetchIntervalInBackground: false,

    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: false,

    retry: 1,
    throwOnError: false,
  });
}
