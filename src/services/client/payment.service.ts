import api from "@/lib/client/api";

import type { ApiResponse } from "@/types/common/api.type";
import type {
  BookingGroupPaymentSummary,
  CancelHoldPayload,
  CreatePaymentPayload,
  CreatePaymentResponse,
  PaymentStatusResponse,
  UpdatePaymentMethodPayload,
  BookingGroupResponse,
} from "@/types/client/payment/payment.type";

export async function fetchBookingPaymentSummary(bookingIds: number[]) {
  const res = await api.post<ApiResponse<BookingGroupPaymentSummary>>(
    `/client/bookings/payment-summary`,
    {
      bookingIds,
    },
  );

  return res.data.data;
}
export async function findBookingIds(bookingGroupId: number) {
  const res = await api.get<ApiResponse<BookingGroupResponse>>(
    `/client/bookings/group?bookingGroupId=${bookingGroupId}`,
  );

  return res.data.data;
}
export async function createPayment(payload: CreatePaymentPayload) {
  const res = await api.post<ApiResponse<CreatePaymentResponse>>(
    "/client/payments/create",
    payload,
  );

  return res.data.data;
}

export async function fetchPaymentStatus(paymentId: number) {
  const res = await api.get<ApiResponse<PaymentStatusResponse>>(
    `/client/payments/${paymentId}/status`,
  );

  return res.data.data;
}

export async function updatePaymentMethodApi(
  payload: UpdatePaymentMethodPayload,
) {
  const res = await api.patch<ApiResponse<CreatePaymentResponse>>(
    `/client/payments/${payload.paymentId}/method`,
    {
      bookingIds: payload.bookingIds,
      paymentMethod: payload.paymentMethod,
      sessionId: payload.sessionId,
    },
  );

  return res.data.data;
}

export async function confirmManualPayment(payload: {
  paymentId: number;
  note?: string;
}) {
  const res = await api.post<ApiResponse<{ success: boolean }>>(
    `/client/payments/${payload.paymentId}/manual-confirm`,
    {
      note: payload.note,
    },
  );

  return res.data.data;
}

export async function cancelPaymentHold(payload: CancelHoldPayload) {
  const res = await api.post<ApiResponse<{ success: boolean }>>(
    "/client/bookings/cancel-hold",
    payload,
  );

  return res.data.data;
}
