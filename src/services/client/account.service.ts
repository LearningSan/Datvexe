import api from "@/lib/client/api";
import type { ApiResponse } from "@/types/common/api.type";
import type {
  AccountProfile,
  UpdateAccountProfilePayload,
  ChangePasswordPayload,
  TicketHistoryItem,
} from "@/types/client/user/account.type";
import type { BookingPaymentSummary } from "@/types/client/payment/payment.type";

export async function fetchTicketDetail(bookingId: number) {
  const res = await api.get<ApiResponse<BookingPaymentSummary>>(
    `/client/bookings/${bookingId}/payment-summary`,
  );

  return res.data.data;
}
export async function fetchAccountProfile() {
  const res = await api.get<ApiResponse<AccountProfile>>(
    "/client/account/profile",
  );
  return res.data.data;
}

export async function updateAccountProfile(
  payload: UpdateAccountProfilePayload,
) {
  const res = await api.put<ApiResponse<AccountProfile>>(
    "/client/account/profile",
    payload,
  );

  return res.data.data;
}

export async function changePassword(payload: ChangePasswordPayload) {
  const res = await api.put<ApiResponse<{ success: boolean }>>(
    "/client/account/change-password",
    payload,
  );

  return res.data.data;
}

export async function fetchTicketHistory() {
  const res = await api.get<ApiResponse<TicketHistoryItem[]>>(
    "/client/account/ticket-history",
  );

  return res.data.data;
}
export async function uploadAccountAvatar(file: File) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await api.post<
    ApiResponse<{
      avatarUrl: string;
      avatarPublicId: string;
    }>
  >("/client/account/avatar", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return res.data.data;
}
