import api from "@/lib/client/api";

export async function fetchTripSeats(
  tripId: number
) {
  const response = await api.get(
    `/client/trips/${tripId}/seats`
  );

  return response.data.data;
}