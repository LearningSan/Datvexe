import api from "@/lib/client/api";
import type {
  HoldSeatsPayload,
  HoldSeatsResponse,
} from "@/types/client/payment/hold-seat.type";
import type { CreateBookingInput } from "@/validators/client/booking.validator";
import type { ActiveSeatHold } from "@/types/client/payment/payment.type";

import type { ApiResponse } from "@/types/common/api.type";
export type CreateBookingPayload = CreateBookingInput & {
  sessionId: string;
};
export async function createBooking(payload: CreateBookingPayload) {
  const res = await api.post<ApiResponse<any>>("/client/bookings", payload);

  return res.data.data;
}
export async function previewBooking(payload: any) {
  const response = await api.post<ApiResponse<HoldSeatsResponse>>(
    "/client/bookings/preview",
    payload,
  );

  return response.data.data;
}
export async function saveBookingShuttleApi(payload: any) {
  const response = await api.post<ApiResponse<HoldSeatsResponse>>(
    `/client/bookings/${payload.bookingId}/shuttle-request`,
    payload,
  );

  return response.data.data;
}

export async function holdSeats(payload: HoldSeatsPayload) {
  const response = await api.post<ApiResponse<HoldSeatsResponse>>(
    "/client/bookings/hold_seats",
    payload,
  );

  return response.data.data;
}
export async function cancelHold(payload: {
  bookingId?: number | null;
  sessionId: string;
  tripId: number;
}): Promise<void> {
  await api.post("/client/bookings/cancel-hold", payload);
}
export function cancelSeatHoldOnExit(payload: ActiveSeatHold) {
  navigator.sendBeacon(
    "/api/client/bookings/cancel-hold",
    new Blob([JSON.stringify(payload)], {
      type: "application/json",
    }),
  );
}