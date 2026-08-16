import { execute, query } from "@/lib/server/mysql";

import type { AdminNotificationListParams } from "@/types/admin/notifications/notification-management.type";

interface NotificationRow {
  notification_id: number;

  user_id: number;

  user_full_name: string;

  user_email: string | null;

  user_phone: string | null;

  title: string;

  content: string;

  notification_type: "BOOKING" | "PAYMENT" | "TRIP";

  is_read: number;

  created_at: string;
}

export async function findAdminNotifications(
  params: AdminNotificationListParams,
) {
  const {
    keyword = "",
    notificationType,
    isRead,
    page = 1,
    limit = 10,
  } = params;

  const offset = (page - 1) * limit;

  const conditions: string[] = [];

  const values: any[] = [];

  if (keyword.trim()) {
    conditions.push(`
      (
        n.title LIKE ?
        OR n.content LIKE ?
        OR u.full_name LIKE ?
        OR u.email LIKE ?
        OR u.phone LIKE ?
      )
    `);

    const search = `%${keyword.trim()}%`;

    values.push(search, search, search, search, search);
  }

  if (notificationType) {
    conditions.push("n.notification_type = ?");

    values.push(notificationType);
  }

  if (typeof isRead === "boolean") {
    conditions.push("n.is_read = ?");

    values.push(isRead ? 1 : 0);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const countRows = await query<{ total: number }>(
    `
      SELECT COUNT(*) AS total
      FROM notifications n
      INNER JOIN users u
        ON u.user_id = n.user_id
      ${whereClause}
    `,
    values,
  );

  const total = Number(countRows[0]?.total || 0);
  const statisticsRows = await query<{
    total: number;
    unread: number;
    read_count: number;
    today: number;
  }>(
    `
    SELECT
      COUNT(*) AS total,

      SUM(
        CASE
          WHEN n.is_read = 0 THEN 1
          ELSE 0
        END
      ) AS unread,

      SUM(
        CASE
          WHEN n.is_read = 1 THEN 1
          ELSE 0
        END
      ) AS read_count,

      SUM(
        CASE
          WHEN DATE(n.created_at) = CURDATE()
          THEN 1
          ELSE 0
        END
      ) AS today

    FROM notifications n
    INNER JOIN users u
      ON u.user_id = n.user_id

    ${whereClause}
  `,
    values,
  );
  const statistics = {
    total: Number(statisticsRows[0]?.total || 0),

    unread: Number(statisticsRows[0]?.unread || 0),

    read: Number(statisticsRows[0]?.read_count || 0),

    today: Number(statisticsRows[0]?.today || 0),
  };
  const items = await query<NotificationRow>(
    `
      SELECT
        n.notification_id,
        n.user_id,
        u.full_name AS user_full_name,
        u.email AS user_email,
        u.phone AS user_phone,
        n.title,
        n.content,
        n.notification_type,
        n.is_read,
        n.created_at
      FROM notifications n
      INNER JOIN users u
        ON u.user_id = n.user_id
      ${whereClause}
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
    `,
    [...values, limit, offset],
  );

  return {
    items: items.map((item) => ({
      notificationId: item.notification_id,
      userId: item.user_id,
      userFullName: item.user_full_name,
      userEmail: item.user_email,
      userPhone: item.user_phone,
      title: item.title,
      content: item.content,
      notificationType: item.notification_type,
      isRead: Boolean(item.is_read),
      createdAt: item.created_at,
    })),
    total,
    page,
    limit,
    statistics,
  };
}

export async function findAdminNotificationById(notificationId: number) {
  const rows = await query<NotificationRow>(
    `
        SELECT
          n.notification_id,
          n.user_id,
          u.full_name AS user_full_name,
          u.email AS user_email,
          u.phone AS user_phone,
          n.title,
          n.content,
          n.notification_type,
          n.is_read,
          n.created_at
        FROM notifications n
        INNER JOIN users u
          ON u.user_id = n.user_id
        WHERE n.notification_id = ?
        LIMIT 1
      `,
    [notificationId],
  );

  const item = rows[0];

  if (!item) {
    return null;
  }

  return {
    notificationId: item.notification_id,

    userId: item.user_id,

    userFullName: item.user_full_name,

    userEmail: item.user_email,

    userPhone: item.user_phone,

    title: item.title,

    content: item.content,

    notificationType: item.notification_type,

    isRead: Boolean(item.is_read),

    createdAt: item.created_at,
  };
}

export async function createAdminNotificationRepo(data: {
  userId: number;

  title: string;

  content: string;

  notificationType: "BOOKING" | "PAYMENT" | "TRIP";
}) {
  const result = await execute(
    `
      INSERT INTO notifications (
        user_id,
        title,
        content,
        notification_type,
        is_read
      )
      VALUES (?, ?, ?, ?, FALSE)
    `,
    [data.userId, data.title, data.content, data.notificationType],
  );

  return findAdminNotificationById(result.insertId);
}

export async function updateAdminNotificationRepo(
  notificationId: number,
  data: {
    title: string;

    content: string;

    notificationType: "BOOKING" | "PAYMENT" | "TRIP";
  },
) {
  await execute(
    `
      UPDATE notifications
      SET
        title = ?,
        content = ?,
        notification_type = ?
      WHERE notification_id = ?
    `,
    [data.title, data.content, data.notificationType, notificationId],
  );

  return findAdminNotificationById(notificationId);
}

export async function updateAdminNotificationReadStatusRepo(
  notificationId: number,
  isRead: boolean,
) {
  await execute(
    `
      UPDATE notifications
      SET is_read = ?
      WHERE notification_id = ?
    `,
    [isRead ? 1 : 0, notificationId],
  );

  return findAdminNotificationById(notificationId);
}

export async function deleteAdminNotificationRepo(notificationId: number) {
  return execute(
    `
      DELETE FROM notifications
      WHERE notification_id = ?
    `,
    [notificationId],
  );
}
export async function findAdminNotificationRecipients(keyword: string) {
  const search = `%${keyword.trim()}%`;

  return await query<{
    userId: number;
    fullName: string;
    email: string | null;
    phone: string | null;
  }>(
    `
      SELECT
        u.user_id AS userId,
        u.full_name AS fullName,
        u.email,
        u.phone
      FROM users u
      INNER JOIN roles r
        ON r.role_id = u.role_id
      LEFT JOIN drivers d
        ON d.user_id = u.user_id
      WHERE
        r.role_name = 'CUSTOMER'
        AND d.driver_id IS NULL
        AND u.status = 'ACTIVE'
        AND (
          u.full_name LIKE ?
          OR u.email LIKE ?
          OR u.phone LIKE ?
        )
      ORDER BY u.full_name ASC
      LIMIT 10
    `,
    [search, search, search],
  );
}