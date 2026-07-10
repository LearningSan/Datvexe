import api from "@/lib/client/api";
import type { ApiResponse } from "@/types/common/api.type";
import type {
  AdminRouteListParams,
  AdminRouteListResponse,
  AdminRouteOptionsResponse,
  AdminRoutePayload,
} from "@/types/admin/routes/route-management.type";

function getApiErrorMessage(error: any, fallback: string) {
  return (
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback
  );
}

export async function fetchAdminRoutes(params: AdminRouteListParams) {
  const res = await api.get<ApiResponse<AdminRouteListResponse>>(
    "/admin/routes",
    {
      params,
    },
  );

  return res.data.data;
}

export async function fetchAdminRouteOptions() {
  const res = await api.get<ApiResponse<AdminRouteOptionsResponse>>(
    "/admin/routes/options",
  );

  return res.data.data;
}

export async function createAdminRouteApi(payload: AdminRoutePayload) {
  try {
    const res = await api.post("/admin/routes", payload);
    return res.data.data;
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, "Không thể tạo tuyến xe"));
  }
}

export async function updateAdminRouteApi(
  routeId: number,
  payload: AdminRoutePayload,
) {
  try {
    const res = await api.patch(`/admin/routes/${routeId}`, payload);
    return res.data.data;
  } catch (error: any) {
    throw new Error(getApiErrorMessage(error, "Không thể cập nhật tuyến xe"));
  }
}

export async function updateAdminRouteStatusApi(
  routeId: number,
  payload: {
    status: "ACTIVE" | "SUSPENDED";
    reason: string;
  },
) {
  try {
    const res = await api.patch(`/admin/routes/${routeId}/status`, payload);
    return res.data.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(error, "Không thể cập nhật trạng thái tuyến xe"),
    );
  }
}

export async function duplicateReverseRouteApi(routeId: number) {
  try {
    const res = await api.post(`/admin/routes/${routeId}/duplicate-reverse`);
    return res.data.data;
  } catch (error: any) {
    throw new Error(
      getApiErrorMessage(error, "Không thể tạo tuyến chiều ngược lại"),
    );
  }
}
