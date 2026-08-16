import {
  findAdminNotifications,
  findAdminNotificationById,
  createAdminNotificationRepo,
  updateAdminNotificationRepo,
  updateAdminNotificationReadStatusRepo,
  deleteAdminNotificationRepo,
  findAdminNotificationRecipients,
} from "@/repositories/admin/notification.repo";

import type { AdminNotificationListParams } from "@/types/admin/notifications/notification-management.type";

export async function getAdminNotifications(
  params: AdminNotificationListParams,
) {
  return findAdminNotifications(params);
}

export async function getAdminNotificationDetail(notificationId: number) {
  const notification = await findAdminNotificationById(notificationId);

  if (!notification) {
    throw new Error("Không tìm thấy thông báo");
  }

  return notification;
}

export async function createAdminNotification(data: {
  userId: number;

  title: string;

  content: string;

  notificationType: "BOOKING" | "PAYMENT" | "TRIP";
}) {
  return createAdminNotificationRepo(data);
}

export async function updateAdminNotification(
  notificationId: number,
  data: {
    title: string;

    content: string;

    notificationType: "BOOKING" | "PAYMENT" | "TRIP";
  },
) {
  const existing = await findAdminNotificationById(notificationId);

  if (!existing) {
    throw new Error("Không tìm thấy thông báo");
  }

  return updateAdminNotificationRepo(notificationId, data);
}

export async function updateAdminNotificationReadStatus(
  notificationId: number,
  isRead: boolean,
) {
  const existing = await findAdminNotificationById(notificationId);

  if (!existing) {
    throw new Error("Không tìm thấy thông báo");
  }

  return updateAdminNotificationReadStatusRepo(notificationId, isRead);
}

export async function deleteAdminNotification(notificationId: number) {
  const existing = await findAdminNotificationById(notificationId);

  if (!existing) {
    throw new Error("Không tìm thấy thông báo");
  }

  await deleteAdminNotificationRepo(notificationId);

  return {
    notificationId,
  };
}
export async function searchAdminNotificationRecipients(keyword: string) {
  if (!keyword.trim()) {
    return [];
  }

  return await findAdminNotificationRecipients(keyword);
}
