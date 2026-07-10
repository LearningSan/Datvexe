import api from "@/lib/client/api";
import type { ApiResponse } from "@/types/common/api.type";
import type {
  AdminTicketListParams,
  AdminTicketListResponse,
  AdminTicketOptionsResponse,
  AdminTicketDetail,
  UpdateTicketStatusPayload,
  CancelTicketPayload,
  ExtendTicketHoldPayload,
  AddTicketSeatsPayload,
  ChangeTicketSeatsPayload,
  UpdatePickupDropoffPayload,
  CreateOfflineTicketPayload,
  AdminTicketWarningSummary,
  AdminTripSeatListItem,
  AdminTicketAvailableSeat,
  ResendTicketResponse,
  AdminTicketPassengerItem,
  ChangeTicketTripPayload,
  ChangeTicketPreview,
  CancelTicketPreview,
  AdminOfflineTicketPreview 
} from "@/types/admin/tickets/ticket-management.type";

function throwApiError(error: any, fallback: string): never {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;
  throw new Error(message);
}

export async function fetchAdminTickets(params: AdminTicketListParams) {
  try {
    const res = await api.get<ApiResponse<AdminTicketListResponse>>(
      "/admin/tickets",
      { params },
    );
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải danh sách vé");
  }
}

export async function fetchAdminTicketOptions() {
  try {
    const res = await api.get<ApiResponse<AdminTicketOptionsResponse>>(
      "/admin/tickets/options",
    );
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải dữ liệu lọc vé");
  }
}

export async function fetchAdminTicketWarnings() {
  try {
    const res = await api.get<ApiResponse<AdminTicketWarningSummary>>(
      "/admin/tickets/warnings",
    );
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải cảnh báo vé");
  }
}

export async function fetchAdminTicketDetail(bookingId: number) {
  try {
    const res = await api.get<ApiResponse<AdminTicketDetail>>(
      `/admin/tickets/${bookingId}`,
    );
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải chi tiết vé");
  }
}

export async function updateAdminTicketStatusApi(
  bookingId: number,
  payload: UpdateTicketStatusPayload,
) {
  try {
    const res = await api.patch(`/admin/tickets/${bookingId}/status`, payload);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể cập nhật trạng thái vé");
  }
}

export async function cancelAdminTicketApi(
  bookingId: number,
  payload: CancelTicketPayload,
) {
  try {
    const res = await api.post(`/admin/tickets/${bookingId}/cancel`, payload);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể hủy vé");
  }
}

export async function extendAdminTicketHoldApi(
  bookingId: number,
  payload: ExtendTicketHoldPayload,
) {
  try {
    const res = await api.patch(`/admin/tickets/${bookingId}/hold`, payload);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể gia hạn giữ chỗ");
  }
}

export async function cancelAdminTicketHoldApi(bookingId: number) {
  try {
    const res = await api.delete(`/admin/tickets/${bookingId}/hold`);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể hủy giữ chỗ");
  }
}

export async function addAdminTicketSeatsApi(
  bookingId: number,
  payload: AddTicketSeatsPayload,
) {
  try {
    const res = await api.post(`/admin/tickets/${bookingId}/seats`, payload);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể thêm ghế");
  }
}

export async function changeAdminTicketSeatsApi(
  bookingId: number,
  payload: ChangeTicketSeatsPayload,
) {
  try {
    const res = await api.patch(
      `/admin/tickets/${bookingId}/seats/change`,
      payload,
    );
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể đổi ghế");
  }
}

export async function removeAdminTicketSeatApi(
  bookingId: number,
  bookingSeatId: number,
) {
  try {
    const res = await api.delete(
      `/admin/tickets/${bookingId}/seats/${bookingSeatId}`,
    );
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể gỡ ghế");
  }
}

export async function syncAdminTicketTripSeatsApi(bookingId: number) {
  try {
    const res = await api.post(
      `/admin/tickets/${bookingId}/seats/sync-trip-availability`,
    );
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể đồng bộ ghế trống");
  }
}

export async function updateAdminTicketPickupDropoffApi(
  bookingId: number,
  payload: UpdatePickupDropoffPayload,
) {
  try {
    const res = await api.patch(
      `/admin/tickets/${bookingId}/pickup-dropoff`,
      payload,
    );
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể cập nhật điểm đón/trả");
  }
}

export async function checkinAdminTicketApi(bookingId: number) {
  try {
    const res = await api.post(`/admin/tickets/${bookingId}/checkin`);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể check-in vé");
  }
}

export async function checkinAdminTicketSeatApi(
  bookingId: number,
  bookingSeatId: number,
) {
  try {
    const res = await api.post(
      `/admin/tickets/${bookingId}/seats/${bookingSeatId}/checkin`,
    );
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể check-in ghế");
  }
}

export async function createAdminOfflineTicketApi(
  payload: CreateOfflineTicketPayload,
) {
  try {
    const res = await api.post("/admin/tickets/offline", payload);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tạo vé offline");
  }
}

export async function resendAdminTicketApi(bookingId: number) {
  try {
    const res = await api.post(`/admin/tickets/${bookingId}/resend-ticket`);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể gửi lại vé");
  }
}

export async function searchAdminTicketForCheckinApi(bookingCode: string) {
  try {
    const res = await api.get<ApiResponse<AdminTicketDetail>>(
      "/admin/tickets/checkin/search",
      {
        params: { bookingCode },
      },
    );
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không tìm thấy vé để check-in");
  }
}

export async function exportAdminTicketPdfApi(bookingId: number) {
  try {
    const res = await api.get(`/admin/tickets/${bookingId}/export-pdf`, {
      responseType: "blob",
    });
    return res.data as Blob;
  } catch (error: any) {
    throwApiError(error, "Không thể xuất PDF vé");
  }
}

export async function fetchAdminTicketPrintHtmlApi(bookingId: number) {
  try {
    const res = await api.get<ApiResponse<{ html: string }>>(
      `/admin/tickets/${bookingId}/print`,
    );
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể lấy mẫu in vé");
  }
}

export async function fetchCancelAdminTicketPreviewApi(bookingId: number) {
  try {
    const res = await api.get<ApiResponse<CancelTicketPreview>>(
      `/admin/tickets/${bookingId}/cancel/preview`,
    );
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể kiểm tra điều kiện hủy vé");
  }
}

export async function fetchChangeAdminTicketPreviewApi(
  bookingId: number,
  params: {
    newTripId?: number;
    newSeatLayoutDetailIds?: number[];
    pickupPointId?: number | null;
    dropoffPointId?: number | null;
  },
) {
  try {
    const res = await api.get<ApiResponse<ChangeTicketPreview>>(
      `/admin/tickets/${bookingId}/change-preview`,
      {
        params: {
          ...params,
          newSeatLayoutDetailIds: params.newSeatLayoutDetailIds?.join(","),
        },
      },
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể xem trước đổi vé");
  }
}

export async function changeAdminTicketTripApi(
  bookingId: number,
  payload: ChangeTicketTripPayload,
) {
  try {
    const res = await api.post(
      `/admin/tickets/${bookingId}/change-trip`,
      payload,
    );
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể đổi chuyến/vé");
  }
}

export async function undoCheckinAdminTicketApi(bookingId: number) {
  try {
    const res = await api.post(`/admin/tickets/${bookingId}/undo-checkin`);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể bỏ check-in booking");
  }
}

export async function undoCheckinAdminTicketSeatApi(
  bookingId: number,
  bookingSeatId: number,
) {
  try {
    const res = await api.post(
      `/admin/tickets/${bookingId}/seats/${bookingSeatId}/undo-checkin`,
    );
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể bỏ check-in ghế");
  }
}

export async function fetchAdminTripPassengerListApi(tripId: number) {
  try {
    const res = await api.get<ApiResponse<AdminTicketPassengerItem[]>>(
      `/admin/tickets/trips/${tripId}/passenger-list`,
    );
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải danh sách hành khách");
  }
}

export async function fetchAdminTripSeatListApi(tripId: number) {
  try {
    const res = await api.get<ApiResponse<AdminTripSeatListItem[]>>(
      `/admin/tickets/trips/${tripId}/seat-list`,
    );
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải danh sách ghế");
  }
}

export async function fetchAdminTicketPaymentsApi(bookingId: number) {
  try {
    const res = await api.get(`/admin/tickets/${bookingId}/payments`);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải thanh toán của vé");
  }
}

export async function fetchAdminTicketHistoriesApi(bookingId: number) {
  try {
    const res = await api.get(`/admin/tickets/${bookingId}/histories`);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải lịch sử vé");
  }
}

export async function fetchAdminTicketAvailableSeatsApi(bookingId: number) {
  try {
    const res = await api.get<ApiResponse<AdminTicketAvailableSeat[]>>(
      `/admin/tickets/${bookingId}/available-seats`,
    );
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải sơ đồ ghế khả dụng");
  }
}

export async function resendAdminTicketWithResultApi(bookingId: number) {
  try {
    const res = await api.post<ApiResponse<ResendTicketResponse>>(
      `/admin/tickets/${bookingId}/resend-ticket`,
    );
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể gửi lại vé");
  }
}

export async function openAdminTicketPrintWindow(bookingId: number) {
  const data = await fetchAdminTicketPrintHtmlApi(bookingId);

  const printWindow = window.open("", "_blank", "width=820,height=900");
  if (!printWindow) {
    throw new Error(
      "Trình duyệt đã chặn cửa sổ in vé. Vui lòng cho phép popup.",
    );
  }

  printWindow.document.open();
  printWindow.document.write(data.html);
  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
  }, 300);
}

export async function fetchAdminOfflineTicketPreviewApi(tripId: number) {
  try {
    const res = await api.get<ApiResponse<AdminOfflineTicketPreview>>(
      "/admin/tickets/offline/preview",
      {
        params: { tripId },
      },
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải dữ liệu tạo vé offline");
  }
}
