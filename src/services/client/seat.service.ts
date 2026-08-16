import api from "@/lib/client/api";

import type { ApiResponse } from "@/types/common/api.type";
import type { TripSeatResponse } from "@/types/client/seat/seat-response.type";

export async function fetchTripSeats(tripId: number, sessionId: string) {
  const response = await api.get<ApiResponse<TripSeatResponse>>(
    `/client/trips/${tripId}/seats`,
    {
      params: {
        sessionId,
      },
    },
  );

  return response.data.data;
}
