import type mysql from "mysql2/promise";
import { query, connQuery } from "@/lib/server/mysql";
import type { NotificationType } from "@/types/client/notification/notification.type";

export async function findNotificationsByUserId(userId: number) {
  const items = await query(
    `
    SELECT
      notification_id AS notificationId,
      title,
      content,
      notification_type AS type,
      is_read AS isRead,
      created_at AS createdAt
    FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 20
    `,
    [userId],
  );

  const unreadRows = await query<{ unreadCount: number }>(
    `
    SELECT COUNT(*) AS unreadCount
    FROM notifications
    WHERE user_id = ?
      AND is_read = FALSE
    `,
    [userId],
  );

  return {
    items,
    unreadCount: unreadRows[0]?.unreadCount ?? 0,
  };
}

export async function markNotificationRead(
  notificationId: number,
  userId: number,
) {
  await query(
    `
    UPDATE notifications
    SET is_read = TRUE
    WHERE notification_id = ?
      AND user_id = ?
    `,
    [notificationId, userId],
  );
}

export async function createNotification(
  conn: mysql.PoolConnection,
  data: {
    userId: number|null;
    title: string;
    content: string;
    type: NotificationType;
  },
) {
  await connQuery(
    conn,
    `
    INSERT INTO notifications
      (user_id, title, content, notification_type)
    VALUES (?, ?, ?, ?)
    `,
    [data.userId, data.title, data.content, data.type],
  );
}
export async function markAllNotificationsRead(userId: number) {
  await query(
    `
    UPDATE notifications
    SET is_read = TRUE
    WHERE user_id = ?
      AND is_read = FALSE
    `,
    [userId],
  );
}
