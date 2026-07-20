import adminApi from "@/lib/admin/api";
import type {
  PassengerContactHistoryResponse,
  UpdatePassengerContactPayload,
  UpdatePassengerContactResponse,
} from "@/types/admin/checkin/checkin-operation.type";

export async function updatePassengerContactApi(
  payload: UpdatePassengerContactPayload,
): Promise<UpdatePassengerContactResponse> {
  const response = await adminApi.post<UpdatePassengerContactResponse>(
    "/admin/checkins/contact",
    payload,
  );

  return response.data;
}

export async function getPassengerContactHistoryApi(input: {
  bookingId: number;
  tripId: number;
}): Promise<PassengerContactHistoryResponse> {
  const response = await adminApi.get<PassengerContactHistoryResponse>(
    `/admin/checkins/bookings/${input.bookingId}/contact-history`,
    {
      params: {
        tripId: input.tripId,
      },
    },
  );

  return response.data;
}
