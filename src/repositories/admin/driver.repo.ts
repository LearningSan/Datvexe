import { query, withTransaction } from "@/lib/server/mysql";
import type {
  AdminDriverItem,
  AdminDriverListParams,
} from "@/types/admin/drivers/driver-management.type";

export async function findAdminDrivers(params: AdminDriverListParams) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const offset = (page - 1) * limit;

  const conditions: string[] = [];
  const values: any[] = [];

  if (params.keyword) {
    conditions.push(`
      (
        u.full_name LIKE ?
        OR u.phone LIKE ?
        OR d.license_number LIKE ?
      )
    `);

    values.push(
      `%${params.keyword}%`,
      `%${params.keyword}%`,
      `%${params.keyword}%`,
    );
  }

  if (params.driverType) {
    conditions.push("d.driver_type = ?");
    values.push(params.driverType);
  }

  if (params.status) {
    conditions.push("d.status = ?");
    values.push(params.status);
  }

  const whereSql = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const itemsSql = `
    SELECT
      d.driver_id AS driverId,
      u.user_id AS userId,
      u.full_name AS fullName,
      u.email,
      u.phone,
      d.driver_type AS driverType,
      d.license_number AS licenseNumber,
      d.status,
      d.hired_date AS hiredDate,
      COUNT(DISTINCT td.trip_id) AS assignedTripCount,
      d.created_at AS createdAt
    FROM drivers d
    INNER JOIN users u ON u.user_id = d.user_id
    LEFT JOIN roles r ON r.role_id = u.role_id
    LEFT JOIN trip_drivers td ON td.driver_id = d.driver_id
    LEFT JOIN trips t ON t.trip_id = td.trip_id
    ${whereSql}
    GROUP BY
      d.driver_id,
      u.user_id,
      u.full_name,
      u.email,
      u.phone,
      d.driver_type,
      d.license_number,
      d.status,
      d.hired_date,
      d.created_at
ORDER BY
  CASE
    WHEN d.status = 'AVAILABLE' THEN 1
    WHEN d.status = 'ASSIGNED' THEN 2
    WHEN d.status = 'OFF' THEN 3
    ELSE 4
  END ASC,
  d.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM drivers d
    INNER JOIN users u ON u.user_id = d.user_id
    ${whereSql}
  `;

  const items = await query<AdminDriverItem>(itemsSql, [
    ...values,
    limit,
    offset,
  ]);

  const countResult = await query<{ total: number }>(countSql, values);

  return {
    items,
    total: countResult[0]?.total ?? 0,
    page,
    limit,
  };
}
export async function createAdminDriverRepo(data: {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  passwordHash: string;
  roleId: number;
  driverType: "BUS" | "SHUTTLE" | "BOTH";
  licenseNumber: string;
  hiredDate?: string | null;
}) {
  return await withTransaction(async (conn) => {
    const driverRole = await findRoleIdByName("DRIVER");

    if (!driverRole) {
      throw new Error("Role DRIVER không tồn tại");
    }
    const [userResult]: any = await conn.execute(
      `
      INSERT INTO users (
        role_id,
        full_name,
        email,
        phone,
        password_hash,
        status
      )
      VALUES (?, ?, ?, ?, ?, 'ACTIVE')
      `,
      [
        driverRole.roleId,
        data.fullName,
        data.email || null,
        data.phone || null,
        data.passwordHash,
      ],
    );

    const userId = userResult.insertId;

    const [driverResult]: any = await conn.execute(
      `
      INSERT INTO drivers (
        user_id,
        driver_type,
        license_number,
        status,
        hired_date
      )
      VALUES (?, ?, ?, 'AVAILABLE', ?)
      `,
      [userId, data.driverType, data.licenseNumber, data.hiredDate || null],
    );

    return {
      userId,
      driverId: driverResult.insertId,
    };
  });
}

export async function updateAdminDriverRepo(
  driverId: number,
  data: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
    driverType: "BUS" | "SHUTTLE" | "BOTH";
    licenseNumber: string;
    hiredDate?: string | null;
  },
) {
  return await withTransaction(async (conn) => {
    const [drivers]: any = await conn.execute(
      `
      SELECT user_id AS userId
      FROM drivers
      WHERE driver_id = ?
      LIMIT 1
      `,
      [driverId],
    );

    const driver = drivers[0];

    if (!driver) {
      throw new Error("Tài xế không tồn tại");
    }

    await conn.execute(
      `
      UPDATE users
      SET full_name = ?, email = ?, phone = ?
      WHERE user_id = ?
      `,
      [data.fullName, data.email || null, data.phone || null, driver.userId],
    );

    await conn.execute(
      `
      UPDATE drivers
      SET
        driver_type = ?,
        license_number = ?,
        hired_date = ?
      WHERE driver_id = ?
      `,
      [data.driverType, data.licenseNumber, data.hiredDate || null, driverId],
    );

    return {
      driverId,
      userId: driver.userId,
    };
  });
}

export async function updateAdminDriverStatusRepo(
  driverId: number,
  status: "AVAILABLE" | "ASSIGNED" | "OFF",
) {
  const sql = `
    UPDATE drivers
    SET status = ?
    WHERE driver_id = ?
  `;

  await query(sql, [status, driverId]);

  return { driverId, status };
}
export async function deleteAdminDriverRepo(driverId: number) {
  const sql = `
    UPDATE drivers
    SET status = 'OFF'
    WHERE driver_id = ?
  `;

  await query(sql, [driverId]);

  return { driverId };
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
export async function findAdminDriverDetail(driverId: number) {
  const driverRows = await query<any>(
    `
    SELECT
      d.driver_id AS driverId,
      u.user_id AS userId,
      u.full_name AS fullName,
      u.email,
      u.phone,
      u.password_hash AS passwordHash,
      d.driver_type AS driverType,
      d.license_number AS licenseNumber,
      d.status,
      d.hired_date AS hiredDate,
      d.created_at AS createdAt,
      COUNT(DISTINCT td.trip_id) AS assignedTripCount,
      COUNT(DISTINCT CASE WHEN t.status IN ('OPEN', 'FULL', 'RUNNING') THEN t.trip_id END) AS upcomingTripCount,
      COUNT(DISTINCT CASE WHEN t.status = 'COMPLETED' THEN t.trip_id END) AS completedTripCount
    FROM drivers d
    INNER JOIN users u ON u.user_id = d.user_id
    LEFT JOIN trip_drivers td ON td.driver_id = d.driver_id
    LEFT JOIN trips t ON t.trip_id = td.trip_id
    WHERE d.driver_id = ?
    GROUP BY
      d.driver_id,
      u.user_id,
      u.full_name,
      u.email,
      u.phone,
      u.password_hash,
      d.driver_type,
      d.license_number,
      d.status,
      d.hired_date,
      d.created_at
    LIMIT 1
    `,
    [driverId],
  );

  if (!driverRows[0]) return null;

  const assignments = await query<any>(
    `
    SELECT
      t.trip_id AS tripId,
      CONCAT(oc.city_name, ' → ', dc.city_name) AS routeName,
      oc.city_name AS originCityName,
      dc.city_name AS destinationCityName,
      t.departure_datetime AS departureDatetime,
      t.arrival_datetime AS arrivalDatetime,
      t.status AS tripStatus,
      td.assigned_role AS assignedRole,
      v.vehicle_name AS vehicleName,
      v.license_plate AS licensePlate
    FROM trip_drivers td
    INNER JOIN trips t ON t.trip_id = td.trip_id
    INNER JOIN routes r ON r.route_id = t.route_id
    INNER JOIN cities oc ON oc.city_id = r.origin_city_id
    INNER JOIN cities dc ON dc.city_id = r.destination_city_id
    LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
    WHERE td.driver_id = ?
    ORDER BY t.departure_datetime DESC
    LIMIT 15
    `,
    [driverId],
  );

  const oauthRows = await query<{ provider: string }>(
    `
    SELECT provider
    FROM user_oauth_accounts
    WHERE user_id = ?
    ORDER BY provider ASC
    `,
    [driverRows[0].userId],
  );

  const loginMethods: string[] = [];

  if (driverRows[0].passwordHash) {
    loginMethods.push("LOCAL");
  }

  for (const row of oauthRows) {
    loginMethods.push(row.provider);
  }

  const { passwordHash, ...safeDriver } = driverRows[0];

  return {
    ...safeDriver,
    loginMethods: loginMethods.length > 0 ? loginMethods : ["LOCAL"],
    assignments,
  };
}

export async function resetAdminDriverPasswordRepo(
  driverId: number,
  passwordHash: string,
) {
  const result: any = await query(
    `
    UPDATE users u
    INNER JOIN drivers d ON d.user_id = u.user_id
    SET u.password_hash = ?
    WHERE d.driver_id = ?
    `,
    [passwordHash, driverId],
  );

  if (result.affectedRows === 0) {
    throw new Error("Không tìm thấy tài xế cần reset mật khẩu");
  }

  return { driverId };
}