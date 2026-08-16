import api from "@/lib/client/api";

import type { ApiResponse } from "@/types/common/api.type";

import type {
  CancelTicketResponse,
  CancelTicketPreview,
  ChangeTicketPayload,
  ChangeTicketPreview,
  ChangeTicketResponse,
} from "@/types/client/ticket/ticket.type";

export async function getCancelTicketPreview(
  bookingId: number,
): Promise<CancelTicketPreview> {
  const response = await api.get(
    `/client/bookings/${bookingId}/cancel/preview`,
  );

  return response.data.data;
}
export async function cancelTicket(bookingId: number) {
  const res = await api.post<ApiResponse<CancelTicketResponse>>(
    `/client/bookings/${bookingId}/cancel`,
  );

  return res.data.data;
}

export async function previewChangeTicket(
  bookingId: number,
  payload: ChangeTicketPayload,
): Promise<ChangeTicketPreview> {
  const response = await api.post<ApiResponse<ChangeTicketPreview>>(
    `/client/bookings/${bookingId}/change/preview`,
    payload,
  );

  return response.data.data;
}

// ============================================================
// CONFIRM ĐỔI VÉ
// ============================================================

export async function confirmChangeTicket(
  bookingId: number,
  payload: ChangeTicketPayload,
): Promise<ChangeTicketResponse> {
  const response = await api.post<ApiResponse<ChangeTicketResponse>>(
    `/client/bookings/${bookingId}/change/confirm`,
    payload,
  );

  return response.data.data;
}
