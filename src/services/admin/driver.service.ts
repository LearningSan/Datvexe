import adminApi from "@/lib/admin/api";
import type { ApiResponse } from "@/types/common/api.type";
import type {
  AdminDriverListParams,
  AdminDriverListResponse,
} from "@/types/admin/drivers/driver-management.type";

export async function fetchAdminDrivers(params: AdminDriverListParams) {
  const res = await adminApi.get<ApiResponse<AdminDriverListResponse>>(
    "/admin/drivers",
    {
      params,
    },
  );

  return res.data.data;
}
export async function createAdminDriverApi(payload: any) {
  const res = await adminApi.post("/admin/drivers", payload);
  return res.data.data;
}

export async function updateAdminDriverApi(driverId: number, payload: any) {
  const res = await adminApi.patch(`/admin/drivers/${driverId}`, payload);
  return res.data.data;
}

export async function updateAdminDriverStatusApi(
  driverId: number,
  status: "AVAILABLE" | "ASSIGNED" | "OFF",
) {
  const res = await adminApi.patch(`/admin/drivers/${driverId}/status`, { status });
  return res.data.data;
}
export async function deleteAdminDriverApi(driverId: number) {
  const res = await adminApi.delete(`/admin/drivers/${driverId}`);
  return res.data.data;
}
export async function fetchAdminDriverDetail(driverId: number) {
  const res = await adminApi.get(`/admin/drivers/${driverId}`);
  return res.data.data;
}

export async function resetAdminDriverPasswordApi(
  driverId: number,
  payload: { newPassword: string },
) {
  const res = await adminApi.patch(
    `/admin/drivers/${driverId}/reset-password`,
    payload,
  );

  return res.data.data;
}