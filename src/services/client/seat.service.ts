import api from "@/lib/client/api";
import { ApiResponse } from "@/types/common/api.type";
import { TripSeatResponse } from "@/types/client/seat/seat-response.type";

export async function fetchTripSeats(tripId: number) {
  const response = await api.get<ApiResponse<TripSeatResponse>>(
    `/client/trips/${tripId}/seats`,
  );

  return response.data.data;
}
