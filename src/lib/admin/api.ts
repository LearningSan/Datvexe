import axios, { AxiosError, type InternalAxiosRequestConfig } from "axios";

import { useAdminAuthStore } from "@/store/admin-auth.store";

import type { AdminAuthResponse } from "@/types/admin/auth/admin-auth.type";

interface RetryRequestConfig extends InternalAxiosRequestConfig {
  _adminRetry?: boolean;
}

const adminApi = axios.create({
  baseURL: "/api",
  withCredentials: true,
});

let refreshPromise: Promise<string> | null = null;

async function refreshAdminAccessToken() {
  if (!refreshPromise) {
    refreshPromise = axios
      .post<AdminAuthResponse>("/api/admin/auth/refresh", undefined, {
        withCredentials: true,
      })
      .then((response) => {
        const data = response.data.data;

        useAdminAuthStore.getState().setAuth({
          accessToken: data.accessToken,
          user: data.user,
        });

        return data.accessToken;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }

  return await refreshPromise;
}

adminApi.interceptors.request.use((config) => {
  const accessToken = useAdminAuthStore.getState().accessToken;

  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }

  return config;
});

adminApi.interceptors.response.use(
  (response) => response,

  async (error: AxiosError) => {
    const originalRequest = error.config as RetryRequestConfig | undefined;

    if (
      error.response?.status !== 401 ||
      !originalRequest ||
      originalRequest._adminRetry
    ) {
      return Promise.reject(error);
    }

    const requestUrl = originalRequest.url ?? "";

    if (
      requestUrl.includes("/admin/auth/login") ||
      requestUrl.includes("/admin/auth/refresh") ||
      requestUrl.includes("/admin/auth/logout")
    ) {
      return Promise.reject(error);
    }

    originalRequest._adminRetry = true;

    try {
      const accessToken = await refreshAdminAccessToken();

      originalRequest.headers.Authorization = `Bearer ${accessToken}`;

      return adminApi(originalRequest);
    } catch (refreshError) {
      useAdminAuthStore.getState().clearAuth();

      return Promise.reject(refreshError);
    }
  },
);

export default adminApi;
