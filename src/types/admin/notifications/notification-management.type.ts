export type AdminNotificationType = "BOOKING" | "PAYMENT" | "TRIP";

export type AdminNotificationReadStatus = "READ" | "UNREAD";

export interface AdminNotificationItem {
  notificationId: number;

  userId: number;

  userFullName: string;

  userEmail: string | null;

  userPhone: string | null;

  title: string;

  content: string;

  notificationType: AdminNotificationType;

  isRead: boolean;

  createdAt: string;
}

export interface AdminNotificationListParams {
  keyword?: string;

  notificationType?: AdminNotificationType;

  isRead?: boolean;

  page?: number;

  limit?: number;
}

export interface AdminNotificationListResponse {
  items: AdminNotificationItem[];

  total: number;

  page: number;

  limit: number;
}

export interface CreateAdminNotificationPayload {
  userId: number;

  title: string;

  content: string;

  notificationType: AdminNotificationType;
}

export interface UpdateAdminNotificationPayload {
  title: string;

  content: string;

  notificationType: AdminNotificationType;
}
export interface AdminNotificationStatistics {
  total: number;
  unread: number;
  read: number;
  today: number;
}

export interface AdminNotificationListResponse {
  items: AdminNotificationItem[];
  total: number;
  page: number;
  limit: number;
  statistics: AdminNotificationStatistics;
}
