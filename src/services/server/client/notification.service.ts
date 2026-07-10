import {
  findNotificationsByUserId,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/repositories/client/notification.repo";

export async function getUserNotifications(userId: number) {
  return await findNotificationsByUserId(userId);
}

export async function readNotification(notificationId: number, userId: number) {
  await markNotificationRead(notificationId, userId);

  return {
    success: true,
  };
}

export async function readAllNotifications(userId: number) {
  await markAllNotificationsRead(userId);

  return {
    success: true,
  };
}
