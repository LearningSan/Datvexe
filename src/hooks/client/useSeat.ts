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

    staleTime: 1000 * 10,

    gcTime: 1000 * 60 * 10,

    refetchInterval: false,

    refetchOnWindowFocus: false,
    refetchOnReconnect: false,

    refetchOnMount: false,

    retry: 1,
    throwOnError: false,
  });
}
