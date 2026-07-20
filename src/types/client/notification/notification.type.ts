export type NotificationType =
  | "BOOKING"
  | "PAYMENT"
  | "CHECKIN"
  | "SYSTEM";

export interface NotificationItem {
  notificationId: number;
  title: string;
  content: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
}

export interface NotificationResponse {
  items: NotificationItem[];
  unreadCount: number;
}