import api from "@/lib/client/api";
import type {
  HoldSeatsPayload,
  HoldSeatsResponse,
} from "@/types/client/payment/hold-seat.type";
import type { CreateBookingInput } from "@/validators/client/booking.validator";
import type {
  ActiveSeatHold,
  CancelHoldPayload,
} from "@/types/client/payment/payment.type";

import type { ApiResponse } from "@/types/common/api.type";
export type CreateBookingPayload = CreateBookingInput & {
  sessionId: string;
};
export async function createBooking(payload: CreateBookingInput) {
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
export async function releaseSeats(payload: HoldSeatsPayload) {
  await api.post("/client/bookings/release_seats", payload);
}

export function cancelSeatHoldOnExit(payload: ActiveSeatHold) {
  if (!payload.sessionId || !payload.tripIds?.length) {
    return;
  }

  payload.tripIds.forEach((tripId) => {
    navigator.sendBeacon(
      "/api/client/bookings/cancel-hold",
      new Blob(
        [
          JSON.stringify({
            bookingId: null,
            sessionId: payload.sessionId,
            tripId,
          }),
        ],
        {
          type: "application/json",
        },
      ),
    );
  });
}

export async function cleanupExpiredSeatHolds() {
  const response = await api.post("/client/bookings/hold_seats/cleanup");

  return response.data.data;
}
