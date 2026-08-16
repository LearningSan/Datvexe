import { useQuery } from "@tanstack/react-query";

import { fetchTripSeats } from "@/services/client/seat.service";

import type { TripSeatResponse } from "@/types/client/seat/seat-response.type";

export function useTripSeats(tripId?: number, sessionId?: string) {
  return useQuery<TripSeatResponse>({
    queryKey: ["trip-seats", tripId, sessionId],

    queryFn: () => fetchTripSeats(tripId!, sessionId!),

    enabled: !!tripId && !!sessionId,

    meta: {
      globalLoading: false,
    },

    staleTime: 0,
    gcTime: 1000 * 60 * 10,

    refetchInterval: 1000 * 60,
    refetchIntervalInBackground: false,

    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,

    retry: 1,
    throwOnError: false,
  });
}
