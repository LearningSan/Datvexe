import adminApi from "@/lib/admin/api";

import type { ApiResponse } from "@/types/common/api.type";

import type {
  AdminNotificationListParams,
  AdminNotificationListResponse,
  AdminNotificationItem,
  CreateAdminNotificationPayload,
  UpdateAdminNotificationPayload,
} from "@/types/admin/notifications/notification-management.type";
export interface AdminNotificationRecipient {
  userId: number;
  fullName: string;
  email: string | null;
  phone: string | null;
}
function throwApiError(error: any, fallback: string): never {
  const message =
    error?.response?.data?.message ||
    error?.response?.data?.error ||
    error?.message ||
    fallback;

  throw new Error(message);
}

export async function fetchAdminNotifications(
  params: AdminNotificationListParams,
) {
  try {
    const res = await adminApi.get<ApiResponse<AdminNotificationListResponse>>(
      "/admin/notifications",
      {
        params,
      },
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải danh sách thông báo");
  }
}

export async function fetchAdminNotificationDetail(notificationId: number) {
  try {
    const res = await adminApi.get<ApiResponse<AdminNotificationItem>>(
      `/admin/notifications/${notificationId}`,
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tải chi tiết thông báo");
  }
}

export async function createAdminNotificationApi(
  payload: CreateAdminNotificationPayload,
) {
  try {
    const res = await adminApi.post<ApiResponse<AdminNotificationItem>>(
      "/admin/notifications",
      payload,
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể tạo thông báo");
  }
}

export async function updateAdminNotificationApi(
  notificationId: number,
  payload: UpdateAdminNotificationPayload,
) {
  try {
    const res = await adminApi.patch<ApiResponse<AdminNotificationItem>>(
      `/admin/notifications/${notificationId}`,
      payload,
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể cập nhật thông báo");
  }
}

export async function updateAdminNotificationReadStatusApi(
  notificationId: number,
  isRead: boolean,
) {
  try {
    const res = await adminApi.patch<ApiResponse<AdminNotificationItem>>(
      `/admin/notifications/${notificationId}`,
      {
        isRead,
      },
    );

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể cập nhật trạng thái thông báo");
  }
}

export async function deleteAdminNotificationApi(notificationId: number) {
  try {
    const res = await adminApi.delete<
      ApiResponse<{
        notificationId: number;
      }>
    >(`/admin/notifications/${notificationId}`);

    return res.data.data;
  } catch (error: any) {
    throwApiError(error, "Không thể xóa thông báo");
  }
}
export async function searchAdminNotificationRecipientsApi(keyword: string) {
  try {
    const res = await adminApi.get("/admin/notifications/recipients", {
      params: {
        keyword,
      },
    });

    return res.data.data as AdminNotificationRecipient[];
  } catch (error: any) {
    const message =
      error?.response?.data?.message ||
      error?.response?.data?.error ||
      error?.message ||
      "Không thể tìm người nhận";

    throw new Error(message);
  }
}
