export type NotificationType =
  | "BOOKING"
  | "PAYMENT"
  | "TRIP"
  | "SHUTTLE"
  | "REFUND";

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