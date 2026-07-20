import adminApi from "@/lib/admin/api";

import type { ApiResponse } from "@/types/common/api.type";

import type {
  AdminPickupPointDetail,
  AdminPickupPointListParams,
  AdminPickupPointListResponse,
  CreateAdminPickupPointPayload,
  UpdateAdminPickupPointPayload,
} from "@/types/admin/pickup-points/pickup-point-management.type";

import type {
  AdminCityOption,
  AdminZoneOption,
} from "@/types/admin/pickup-points/pickup-point-option.type";

export async function fetchAdminPickupPointLocationOptions(cityId?: number) {
  try {
    const res = await adminApi.get<
      ApiResponse<{
        cities: AdminCityOption[];
        zones: AdminZoneOption[];
      }>
    >("/admin/pickup-points/location-options", {
      params: {
        cityId,
      },
    });

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải danh sách thành phố/khu vực");
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

export async function fetchAdminPickupPoints(
  params: AdminPickupPointListParams,
) {
  try {
    const res = await adminApi.get<ApiResponse<AdminPickupPointListResponse>>(
      "/admin/pickup-points",
      { params },
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải danh sách điểm đón trả");
  }
}

export async function fetchAdminPickupPointDetail(pickupPointId: number) {
  try {
    const res = await adminApi.get<ApiResponse<AdminPickupPointDetail>>(
      `/admin/pickup-points/${pickupPointId}`,
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải chi tiết điểm đón trả");
  }
}

export async function createAdminPickupPointApi(
  payload: CreateAdminPickupPointPayload,
) {
  try {
    const res = await adminApi.post("/admin/pickup-points", payload);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tạo điểm đón trả");
  }
}

export async function updateAdminPickupPointApi(
  pickupPointId: number,
  payload: UpdateAdminPickupPointPayload,
) {
  try {
    const res = await adminApi.patch(
      `/admin/pickup-points/${pickupPointId}`,
      payload,
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể cập nhật điểm đón trả");
  }
}

export async function updateAdminPickupPointStatusApi(
  pickupPointId: number,
  isActive: boolean,
) {
  try {
    const res = await adminApi.patch(
      `/admin/pickup-points/${pickupPointId}/status`,
      { isActive },
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể cập nhật trạng thái điểm");
  }
}

export async function deleteAdminPickupPointApi(pickupPointId: number) {
  try {
    const res = await adminApi.delete(`/admin/pickup-points/${pickupPointId}`);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tạm ngưng điểm đón trả");
  }
}
