import api from "@/lib/client/api";
import type { ApiResponse } from "@/types/common/api.type";
import type {
  AdminVehicleListParams,
  AdminVehicleListResponse,
  AdminVehicleOptionsResponse,
  CreateAdminVehiclePayload,
  UpdateAdminVehiclePayload,
  UpdateVehicleStatusPayload,
} from "@/types/admin/vehicles/vehicle-management.type";

function throwApiError(error: any, fallback: string): never {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;

  throw new Error(message);
}

export async function fetchAdminVehicles(params: AdminVehicleListParams) {
  try {
    const res = await api.get<ApiResponse<AdminVehicleListResponse>>(
      "/admin/vehicles",
      { params },
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải danh sách xe");
  }
}

export async function fetchAdminVehicleOptions() {
  try {
    const res = await api.get<ApiResponse<AdminVehicleOptionsResponse>>(
      "/admin/vehicles/options",
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải dữ liệu loại xe");
  }
}

export async function createAdminVehicleApi(
  payload: CreateAdminVehiclePayload,
) {
  try {
    const res = await api.post("/admin/vehicles", payload);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể thêm xe");
  }
}

export async function updateAdminVehicleApi(
  vehicleId: number,
  payload: UpdateAdminVehiclePayload,
) {
  try {
    const res = await api.patch(`/admin/vehicles/${vehicleId}`, payload);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể cập nhật xe");
  }
}

export async function updateAdminVehicleStatusApi(
  vehicleId: number,
  payload: UpdateVehicleStatusPayload,
) {
  try {
    const res = await api.patch(`/admin/vehicles/${vehicleId}/status`, payload);
    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể cập nhật trạng thái xe");
  }
}
