import api from "@/lib/client/api";
import type { ApiResponse } from "@/types/common/api.type";
import type {
  DuplicateSeatLayoutPayload,
  SeatLayoutDetailResponse,
  SeatLayoutItem,
} from "@/types/admin/seat-layouts/seat-layout-management.type";

function throwApiError(error: any, fallback: string): never {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;

  throw new Error(message);
}

export async function fetchAdminSeatLayouts() {
  try {
    const res = await api.get<ApiResponse<SeatLayoutItem[]>>(
      "/admin/seat-layouts",
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải danh sách sơ đồ ghế");
  }
}

export async function fetchAdminSeatLayoutDetail(seatLayoutId: number) {
  try {
    const res = await api.get<ApiResponse<SeatLayoutDetailResponse>>(
      `/admin/seat-layouts/${seatLayoutId}`,
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải chi tiết sơ đồ ghế");
  }
}

export async function duplicateAdminSeatLayoutApi(
  seatLayoutId: number,
  payload: DuplicateSeatLayoutPayload,
) {
  try {
    const res = await api.post(
      `/admin/seat-layouts/${seatLayoutId}/duplicate`,
      payload,
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể nhân bản sơ đồ ghế");
  }
}

export async function updateAdminSeatLayoutStatusApi(
  seatLayoutId: number,
  isActive: boolean,
) {
  try {
    const res = await api.patch(`/admin/seat-layouts/${seatLayoutId}/status`, {
      isActive,
    });

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể cập nhật trạng thái sơ đồ ghế");
  }
}
