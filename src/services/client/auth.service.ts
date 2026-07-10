import api from "@/lib/client/api";

import type { ApiResponse } from "@/types/common/api.type";
import type { AuthResponse } from "@/types/client/auth/auth.type";

export async function fetchCurrentUser() {
  const res = await api.get<ApiResponse<any>>("/client/me");

  return res.data.data;
}

export async function login(payload: { identifier: string; password: string }) {
  const res = await api.post<ApiResponse<AuthResponse>>("/client/auth/login", payload);

  return res.data.data;
}

export async function register(payload: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}) {
  const res = await api.post<
    ApiResponse<{
      user: any;
      message: string;
    }>
  >("/client/auth/register", payload);

  return res.data.data;
}

export async function verifyEmailOtp(payload: { email: string; otp: string }) {
  const res = await api.post<
    ApiResponse<{
      success: boolean;
      message: string;
    }>
  >("/client/auth/verify-email-otp", payload);

  return res.data.data;
}

export async function refreshAuth() {
  const res = await api.post<ApiResponse<AuthResponse>>("/client/auth/refresh");

  return res.data.data;
}

export async function logout() {
  const res = await api.post<ApiResponse<{ success: boolean }>>("/client/auth/logout");

  return res.data.data;
}
