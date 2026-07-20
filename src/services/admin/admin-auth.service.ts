import axios from "axios";

import adminApi from "@/lib/admin/api";

import type {
  AdminAuthData,
  AdminAuthResponse,
  AdminLoginPayload,
  AdminLogoutResponse,
} from "@/types/admin/auth/admin-auth.type";

export async function loginAdmin(
  payload: AdminLoginPayload,
): Promise<AdminAuthData> {
  const response = await adminApi.post<AdminAuthResponse>(
    "/admin/auth/login",
    payload,
  );

  return response.data.data;
}

/**
 * Dùng axios gốc để tránh interceptor tự refresh
 * trong lúc đang bootstrap phiên.
 */
export async function restoreAdminSession(): Promise<AdminAuthData> {
  const response = await axios.post<AdminAuthResponse>(
    "/api/admin/auth/refresh",
    undefined,
    {
      withCredentials: true,
    },
  );

  return response.data.data;
}

export async function logoutAdmin(): Promise<void> {
  await adminApi.post<AdminLogoutResponse>("/admin/auth/logout");
}
