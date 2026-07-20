import adminApi from "@/lib/admin/api";
import type { ApiResponse } from "@/types/common/api.type";

import type {
  AdminTripListParams,
  AdminTripListResponse,
  AdminTripOptionsResponse,
  CreateAdminTripPayload,
  UpdateAdminTripPayload,
  UpdateTripStatusPayload,
  BulkUpdateTripPricePayload,
  CopyTripsPayload,
} from "@/types/admin/trips/trip-management.type";

export async function copyAdminTripsApi(payload: CopyTripsPayload) {
  try {
    const res = await adminApi.post("/admin/trips/copy", payload);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể sao chép lịch chuyến");
  }
}

export async function bulkUpdateTripPriceApi(
  payload: BulkUpdateTripPricePayload,
) {
  try {
    const res = await adminApi.patch("/admin/trips/bulk-price", payload);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể cập nhật giá hàng loạt");
  }
}
function throwApiError(error: any, fallback: string): never {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;

  throw new Error(message);
}

export async function fetchAdminTrips(params: AdminTripListParams) {
  try {
    const res = await adminApi.get<ApiResponse<AdminTripListResponse>>(
      "/admin/trips",
      { params },
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải danh sách chuyến xe");
  }
}

export async function fetchAdminTripOptions() {
  try {
    const res = await adminApi.get<ApiResponse<AdminTripOptionsResponse>>(
      "/admin/trips/options",
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải dữ liệu bộ lọc chuyến xe");
  }
}

export async function createAdminTripApi(payload: CreateAdminTripPayload) {
  try {
    const res = await adminApi.post("/admin/trips", payload);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tạo chuyến xe");
  }
}

export async function updateAdminTripApi(
  tripId: number,
  payload: UpdateAdminTripPayload,
) {
  try {
    const res = await adminApi.patch(`/admin/trips/${tripId}`, payload);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể cập nhật chuyến xe");
  }
}

export async function updateAdminTripStatusApi(
  tripId: number,
  payload: UpdateTripStatusPayload,
) {
  try {
    const res = await adminApi.patch(`/admin/trips/${tripId}/status`, payload);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể cập nhật trạng thái chuyến xe");
  }
}
