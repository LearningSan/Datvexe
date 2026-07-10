import { query } from "@/lib/server/mysql";
import type {
  AdminUserItem,
  AdminUserListParams,
} from "@/types/admin/users/user-management.type";

export async function findAdminUsers(params: AdminUserListParams) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const offset = (page - 1) * limit;

  const keyword = params.keyword?.trim() ?? "";
  const status = params.status;

  const searchValues = [
    keyword,
    `%${keyword}%`,
    `%${keyword}%`,
    `%${keyword}%`,
  ];

  const statusSql = status ? `AND customers.status = ?` : "";
  const statusValues = status ? [status] : [];

  const itemsSql = `
    SELECT *
    FROM (
      SELECT
        u.user_id AS userId,
        'REGISTERED' AS customerType,
        u.full_name AS fullName,
        u.email,
        u.phone,
        r.role_name AS roleName,
        u.status,
        u.avatar_url AS avatarUrl,
        COUNT(DISTINCT b.booking_id) AS bookingCount,
        MAX(s.created_at) AS lastLoginAt,
        u.created_at AS createdAt
      FROM users u
      INNER JOIN roles r ON r.role_id = u.role_id
      LEFT JOIN bookings b ON b.user_id = u.user_id
      LEFT JOIN auth_sessions s ON s.user_id = u.user_id
      LEFT JOIN drivers d ON d.user_id = u.user_id
      WHERE
        r.role_name = 'CUSTOMER'
        AND d.driver_id IS NULL
      GROUP BY
        u.user_id,
        u.full_name,
        u.email,
        u.phone,
        r.role_name,
        u.status,
        u.created_at,
         u.avatar_url
      UNION ALL

      SELECT
        NULL AS userId,
        'GUEST' AS customerType,
        b.contact_name AS fullName,
        b.contact_email AS email,
        b.contact_phone AS phone,
        'GUEST' AS roleName,
        'ACTIVE' AS status,
         NULL AS avatarUrl,
        COUNT(DISTINCT b.booking_id) AS bookingCount,
        NULL AS lastLoginAt,
        MIN(b.created_at) AS createdAt
      FROM bookings b
      WHERE b.user_id IS NULL
      GROUP BY
        b.contact_name,
        b.contact_email,
        b.contact_phone
    ) customers
    WHERE
      (
        ? = ''
        OR customers.fullName LIKE ?
        OR customers.email LIKE ?
        OR customers.phone LIKE ?
      )
      ${statusSql}
  ORDER BY
  CASE
    WHEN customers.status = 'ACTIVE' THEN 1
    WHEN customers.status = 'BLOCKED' THEN 2
    ELSE 3
  END ASC,
  customers.createdAt DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM (
      SELECT
        u.user_id AS customerKey,
        u.full_name AS fullName,
        u.email,
        u.phone,
        u.status
      FROM users u
      INNER JOIN roles r ON r.role_id = u.role_id
      LEFT JOIN drivers d ON d.user_id = u.user_id
      WHERE
        r.role_name = 'CUSTOMER'
        AND d.driver_id IS NULL

      UNION ALL

      SELECT
        CONCAT(
          'GUEST-',
          IFNULL(b.contact_phone, ''),
          '-',
          IFNULL(b.contact_email, '')
        ) AS customerKey,
        b.contact_name AS fullName,
        b.contact_email AS email,
        b.contact_phone AS phone,
        'ACTIVE' AS status
      FROM bookings b
      WHERE b.user_id IS NULL
      GROUP BY
        b.contact_name,
        b.contact_email,
        b.contact_phone
    ) customers
    WHERE
      (
        ? = ''
        OR customers.fullName LIKE ?
        OR customers.email LIKE ?
        OR customers.phone LIKE ?
      )
      ${statusSql}
  `;

  const items = await query<AdminUserItem>(itemsSql, [
    ...searchValues,
    ...statusValues,
    limit,
    offset,
  ]);

  const countResult = await query<{ total: number }>(countSql, [
    ...searchValues,
    ...statusValues,
  ]);

  return {
    items,
    total: countResult[0]?.total ?? 0,
    page,
    limit,
  };
}

export async function findRoleIdByName(roleName: string) {
  const sql = `
    SELECT role_id AS roleId
    FROM roles
    WHERE role_name = ?
    LIMIT 1
  `;

  const result = await query<{ roleId: number }>(sql, [roleName]);

  return result[0] || null;
}

export async function createAdminUserRepo(data: {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  passwordHash: string;
}) {
  const customerRole = await findRoleIdByName("CUSTOMER");

  if (!customerRole) {
    throw new Error("Role CUSTOMER không tồn tại");
  }

  const sql = `
    INSERT INTO users (
      role_id,
      full_name,
      email,
      phone,
      password_hash,
      status
    )
    VALUES (?, ?, ?, ?, ?, 'ACTIVE')
  `;

  const result: any = await query(sql, [
    customerRole.roleId,
    data.fullName.trim(),
    data.email || null,
    data.phone || null,
    data.passwordHash,
  ]);

  return {
    userId: result.insertId,
  };
}

export async function updateAdminUserRepo(
  userId: number,
  data: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
  },
) {
  const sql = `
    UPDATE users u
    INNER JOIN roles r ON r.role_id = u.role_id
    SET
      u.full_name = ?,
      u.email = ?,
      u.phone = ?
    WHERE u.user_id = ?
      AND r.role_name = 'CUSTOMER'
  `;

  const result: any = await query(sql, [
    data.fullName.trim(),
    data.email || null,
    data.phone || null,
    userId,
  ]);

  if (result.affectedRows === 0) {
    throw new Error("Không tìm thấy khách hàng cần cập nhật");
  }

  return { userId };
}

export async function updateAdminUserStatusRepo(
  userId: number,
  status: "ACTIVE" | "BLOCKED",
) {
  const sql = `
    UPDATE users u
    INNER JOIN roles r ON r.role_id = u.role_id
    SET u.status = ?
    WHERE u.user_id = ?
      AND r.role_name = 'CUSTOMER'
  `;

  const result: any = await query(sql, [status, userId]);

  if (result.affectedRows === 0) {
    throw new Error("Không tìm thấy khách hàng cần cập nhật trạng thái");
  }

  return { userId, status };
}

export async function findAdminUserDetail(userId: number) {
  const userRows = await query<any>(
    `
    SELECT
      u.user_id AS userId,
      u.full_name AS fullName,
      u.email,
      u.phone,
      u.avatar_url AS avatarUrl,
      u.password_hash AS passwordHash,
      r.role_name AS roleName,
      u.status,
      u.email_verified_at AS emailVerifiedAt,
      u.created_at AS createdAt,
      u.updated_at AS updatedAt,
      MAX(s.created_at) AS lastLoginAt,
      COUNT(DISTINCT b.booking_id) AS bookingCount,
      COALESCE(
        SUM(
          CASE
            WHEN b.status IN ('CONFIRMED', 'REFUNDED')
            THEN b.total_amount
            ELSE 0
          END
        ),
        0
      ) AS totalSpent
    FROM users u
    INNER JOIN roles r ON r.role_id = u.role_id
    LEFT JOIN auth_sessions s ON s.user_id = u.user_id
    LEFT JOIN bookings b ON b.user_id = u.user_id
    LEFT JOIN drivers d ON d.user_id = u.user_id
    WHERE u.user_id = ?
      AND r.role_name = 'CUSTOMER'
      AND d.driver_id IS NULL
    GROUP BY
      u.user_id,
      u.full_name,
      u.email,
      u.phone,
      u.avatar_url,
      u.password_hash,
      r.role_name,
      u.status,
      u.email_verified_at,
      u.created_at,
      u.updated_at
    LIMIT 1
    `,
    [userId],
  );

  if (!userRows[0]) return null;

  const bookings = await query<any>(
    `
    SELECT
      b.booking_id AS bookingId,
      b.booking_code AS bookingCode,
      b.status,
      b.total_amount AS totalAmount,
      b.contact_name AS contactName,
      b.contact_phone AS contactPhone,
      b.contact_email AS contactEmail,
      b.created_at AS createdAt,
      t.departure_datetime AS departureDatetime,
      t.arrival_datetime AS arrivalDatetime,
      oc.city_name AS originCityName,
      dc.city_name AS destinationCityName,
      p.payment_method AS paymentMethod,
      p.status AS paymentStatus,
      p.paid_at AS paidAt,
      COUNT(bs.booking_seat_id) AS seatCount
    FROM bookings b
    INNER JOIN trips t ON t.trip_id = b.trip_id
    INNER JOIN routes ro ON ro.route_id = t.route_id
    INNER JOIN cities oc ON oc.city_id = ro.origin_city_id
    INNER JOIN cities dc ON dc.city_id = ro.destination_city_id
    LEFT JOIN payments p ON p.booking_id = b.booking_id
    LEFT JOIN booking_seats bs ON bs.booking_id = b.booking_id
    WHERE b.user_id = ?
    GROUP BY
      b.booking_id,
      b.booking_code,
      b.status,
      b.total_amount,
      b.contact_name,
      b.contact_phone,
      b.contact_email,
      b.created_at,
      t.departure_datetime,
      t.arrival_datetime,
      oc.city_name,
      dc.city_name,
      p.payment_method,
      p.status,
      p.paid_at
    ORDER BY b.created_at DESC
    LIMIT 10
    `,
    [userId],
  );

  const oauthRows = await query<{ provider: string }>(
    `
    SELECT provider
    FROM user_oauth_accounts
    WHERE user_id = ?
    ORDER BY provider ASC
    `,
    [userId],
  );

  const loginMethods: string[] = [];

  if (userRows[0].passwordHash) {
    loginMethods.push("LOCAL");
  }

  for (const row of oauthRows) {
    loginMethods.push(row.provider);
  }

  const { passwordHash, ...safeUser } = userRows[0];

  return {
    ...safeUser,
    customerType: "REGISTERED",
    loginMethods,
    bookings,
  };
}

export async function findAdminGuestDetail(data: {
  email?: string | null;
  phone?: string | null;
}) {
  const bookings = await query<any>(
    `
    SELECT
      b.booking_id AS bookingId,
      b.booking_code AS bookingCode,
      b.status,
      b.total_amount AS totalAmount,
      b.contact_name AS contactName,
      b.contact_phone AS contactPhone,
      b.contact_email AS contactEmail,
      b.created_at AS createdAt,
      t.departure_datetime AS departureDatetime,
      t.arrival_datetime AS arrivalDatetime,
      oc.city_name AS originCityName,
      dc.city_name AS destinationCityName,
      p.payment_method AS paymentMethod,
      p.status AS paymentStatus,
      p.paid_at AS paidAt,
      COUNT(bs.booking_seat_id) AS seatCount
    FROM bookings b
    INNER JOIN trips t ON t.trip_id = b.trip_id
    INNER JOIN routes ro ON ro.route_id = t.route_id
    INNER JOIN cities oc ON oc.city_id = ro.origin_city_id
    INNER JOIN cities dc ON dc.city_id = ro.destination_city_id
    LEFT JOIN payments p ON p.booking_id = b.booking_id
    LEFT JOIN booking_seats bs ON bs.booking_id = b.booking_id
    WHERE b.user_id IS NULL
      AND (
        (? IS NOT NULL AND b.contact_phone = ?)
        OR (? IS NOT NULL AND b.contact_email = ?)
      )
    GROUP BY
      b.booking_id,
      b.booking_code,
      b.status,
      b.total_amount,
      b.contact_name,
      b.contact_phone,
      b.contact_email,
      b.created_at,
      t.departure_datetime,
      t.arrival_datetime,
      oc.city_name,
      dc.city_name,
      p.payment_method,
      p.status,
      p.paid_at
    ORDER BY b.created_at DESC
    LIMIT 10
    `,
    [data.phone, data.phone, data.email, data.email],
  );

  const first = bookings[0];

  return {
    userId: null,
    customerType: "GUEST",
    fullName: first?.contactName ?? "Khách vãng lai",
    email: first?.contactEmail ?? data.email ?? null,
    phone: first?.contactPhone ?? data.phone ?? null,
    avatarUrl: null,
    roleName: "GUEST",
    status: "ACTIVE",
    emailVerifiedAt: null,
    createdAt: first?.createdAt ?? null,
    updatedAt: null,
    lastLoginAt: null,
    bookingCount: bookings.length,
    totalSpent: bookings.reduce((sum: number, item: any) => {
      if (!["CONFIRMED", "REFUNDED"].includes(String(item.status))) {
        return sum;
      }

      return sum + Number(item.totalAmount ?? 0);
    }, 0),
    loginMethods: [],
    bookings,
  };
}
export async function resetAdminUserPasswordRepo(
  userId: number,
  passwordHash: string,
) {
  const result: any = await query(
    `
    UPDATE users u
    INNER JOIN roles r ON r.role_id = u.role_id
    LEFT JOIN drivers d ON d.user_id = u.user_id
    SET u.password_hash = ?
    WHERE u.user_id = ?
      AND r.role_name = 'CUSTOMER'
      AND d.driver_id IS NULL
    `,
    [passwordHash, userId],
  );

  if (result.affectedRows === 0) {
    throw new Error("Không tìm thấy khách hàng cần reset mật khẩu");
  }

  return { userId };
}
