import adminApi from "@/lib/admin/api";

import type { ApiResponse } from "@/types/common/api.type";

import type {
  AdminVehicleListParams,
  AdminVehicleListResponse,
  AdminVehicleOptionsResponse,
  CreateAdminVehiclePayload,
  UpdateAdminVehiclePayload,
  UpdateVehicleStatusPayload,
} from "@/types/admin/vehicles/vehicle-management.type";

/**
 * =========================================================
 * ERROR HANDLER
 * =========================================================
 */
function throwApiError(error: any, fallback: string): never {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;

  throw new Error(message);
}

/**
 * =========================================================
 * GET - DANH SÁCH XE
 * GET /api/admin/vehicles
 * =========================================================
 */
export async function fetchAdminVehicles(
  params: AdminVehicleListParams,
): Promise<AdminVehicleListResponse> {
  try {
    const res = await adminApi.get<ApiResponse<AdminVehicleListResponse>>(
      "/admin/vehicles",
      {
        params,
      },
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải danh sách xe");
  }
}

/**
 * =========================================================
 * GET - OPTIONS CHO FORM XE
 *
 * GET /api/admin/vehicles/options
 *
 * Trả về:
 * - Loại xe
 * - Sơ đồ ghế thuộc loại xe
 * =========================================================
 */
export async function fetchAdminVehicleOptions(): Promise<AdminVehicleOptionsResponse> {
  try {
    const res = await adminApi.get<ApiResponse<AdminVehicleOptionsResponse>>(
      "/admin/vehicles/options",
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải dữ liệu loại xe");
  }
}

/**
 * =========================================================
 * POST - THÊM XE
 *
 * POST /api/admin/vehicles
 * =========================================================
 */
export async function createAdminVehicleApi(
  payload: CreateAdminVehiclePayload,
): Promise<{ vehicleId: number }> {
  try {
    const res = await adminApi.post<ApiResponse<{ vehicleId: number }>>(
      "/admin/vehicles",
      payload,
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể thêm xe");
  }
}

/**
 * =========================================================
 * PATCH - CẬP NHẬT XE
 *
 * PATCH /api/admin/vehicles/:vehicleId
 * =========================================================
 */
export async function updateAdminVehicleApi(
  vehicleId: number,
  payload: UpdateAdminVehiclePayload,
): Promise<{ vehicleId: number }> {
  try {
    const res = await adminApi.patch<ApiResponse<{ vehicleId: number }>>(
      `/admin/vehicles/${vehicleId}`,
      payload,
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể cập nhật xe");
  }
}

/**
 * =========================================================
 * PATCH - CẬP NHẬT TRẠNG THÁI
 *
 * PATCH /api/admin/vehicles/:vehicleId/status
 * =========================================================
 */
export async function updateAdminVehicleStatusApi(
  vehicleId: number,
  payload: UpdateVehicleStatusPayload,
): Promise<{
  vehicleId: number;
  status: UpdateVehicleStatusPayload["status"];
}> {
  try {
    const res = await adminApi.patch<
      ApiResponse<{
        vehicleId: number;
        status: UpdateVehicleStatusPayload["status"];
      }>
    >(`/admin/vehicles/${vehicleId}/status`, payload);

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể cập nhật trạng thái xe");
  }
}
