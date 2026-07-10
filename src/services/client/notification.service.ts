import api from "@/lib/client/api";
import type { ApiResponse } from "@/types/common/api.type";
import type { NotificationResponse } from "@/types/client/notification/notification.type";

export async function fetchNotifications() {
  const res = await api.get<ApiResponse<NotificationResponse>>(
    "/client/notifications",
  );

  return res.data.data;
}

export async function markNotificationAsRead(notificationId: number) {
  const res = await api.patch<ApiResponse<{ success: boolean }>>(
    `/client/notifications/${notificationId}/read`,
  );

  return res.data.data;
}

export async function markAllNotificationsAsRead() {
  const res = await api.patch<ApiResponse<{ success: boolean }>>(
    "/client/notifications/read-all",
  );

  return res.data.data;
}
