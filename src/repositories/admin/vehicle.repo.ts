import { query } from "@/lib/server/mysql";
import type {
  AdminVehicleListParams,
  CreateAdminVehiclePayload,
  UpdateAdminVehiclePayload,
  VehicleStatus,
} from "@/types/admin/vehicles/vehicle-management.type";

export async function findAdminVehicles(params: AdminVehicleListParams) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const offset = (page - 1) * limit;
  const keyword = params.keyword?.trim() ?? "";

  let whereSql = `
    WHERE (
      ? = ''
      OR v.internal_code LIKE ?
      OR v.license_plate LIKE ?
      OR v.vehicle_name LIKE ?
      OR vt.type_name LIKE ?
    )
  `;

  const values: any[] = [
    keyword,
    `%${keyword}%`,
    `%${keyword}%`,
    `%${keyword}%`,
    `%${keyword}%`,
  ];

  if (params.status) {
    whereSql += ` AND v.status = ?`;
    values.push(params.status);
  }

  if (params.vehicleTypeId) {
    whereSql += ` AND v.vehicle_type_id = ?`;
    values.push(params.vehicleTypeId);
  }

  const fromSql = `
    FROM vehicles v
    INNER JOIN vehicle_types vt ON vt.vehicle_type_id = v.vehicle_type_id
    INNER JOIN seat_layouts sl ON sl.seat_layout_id = v.seat_layout_id
    LEFT JOIN trips t ON t.vehicle_id = v.vehicle_id
    LEFT JOIN bookings b ON b.trip_id = t.trip_id
  `;

  const itemsSql = `
    SELECT
      v.vehicle_id AS vehicleId,
      v.internal_code AS internalCode,
      v.license_plate AS licensePlate,
      v.vehicle_name AS vehicleName,
      v.vehicle_type_id AS vehicleTypeId,
      vt.type_name AS vehicleTypeName,
      v.seat_layout_id AS seatLayoutId,
      sl.layout_code AS layoutCode,
      sl.layout_name AS layoutName,
      sl.total_seats AS totalSeats,
      v.status,
      v.note,
      (
        SELECT DATE_FORMAT(t2.departure_datetime, '%Y-%m-%d %H:%i')
        FROM trips t2
        WHERE t2.vehicle_id = v.vehicle_id
          AND t2.status IN ('OPEN', 'FULL', 'RUNNING')
          AND t2.departure_datetime >= NOW()
        ORDER BY t2.departure_datetime ASC
        LIMIT 1
      ) AS upcomingTrip,
      COUNT(DISTINCT t.trip_id) AS tripCount,
      COUNT(DISTINCT b.booking_id) AS bookingCount,
      CASE
        WHEN COUNT(DISTINCT t.trip_id) > 0 OR COUNT(DISTINCT b.booking_id) > 0
        THEN TRUE ELSE FALSE
      END AS isLocked,
      v.created_at AS createdAt
    ${fromSql}
    ${whereSql}
    GROUP BY
      v.vehicle_id,
      v.internal_code,
      v.license_plate,
      v.vehicle_name,
      v.vehicle_type_id,
      vt.type_name,
      v.seat_layout_id,
      sl.layout_code,
      sl.layout_name,
      sl.total_seats,
      v.status,
      v.note,
      v.created_at
    ORDER BY
      CASE v.status
        WHEN 'AVAILABLE' THEN 1
        WHEN 'ASSIGNED' THEN 2
        WHEN 'MAINTENANCE' THEN 3
        WHEN 'INACTIVE' THEN 4
        ELSE 5
      END,
      v.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(DISTINCT v.vehicle_id) AS total
    ${fromSql}
    ${whereSql}
  `;

  const items = await query<any>(itemsSql, [...values, limit, offset]);
  const count = await query<{ total: number }>(countSql, values);

  return {
    items,
    total: Number(count[0]?.total ?? 0),
    page,
    limit,
  };
}

export async function findVehicleById(vehicleId: number) {
  const result = await query<any>(
    `
    SELECT
      v.vehicle_id AS vehicleId,
      v.internal_code AS internalCode,
      v.license_plate AS licensePlate,
      v.vehicle_name AS vehicleName,
      v.vehicle_type_id AS vehicleTypeId,
      v.seat_layout_id AS seatLayoutId,
      v.status,
      v.note
    FROM vehicles v
    WHERE v.vehicle_id = ?
    LIMIT 1
    `,
    [vehicleId],
  );

  return result[0] ?? null;
}

export async function findVehicleOptions() {
  const vehicleTypes = await query<any>(`
    SELECT
      vt.vehicle_type_id AS vehicleTypeId,
      vt.type_name AS vehicleTypeName,
      sl.seat_layout_id AS seatLayoutId,
      sl.layout_code AS layoutCode,
      sl.layout_name AS layoutName,
      sl.total_seats AS totalSeats
    FROM vehicle_types vt
    INNER JOIN seat_layouts sl ON sl.vehicle_type_id = vt.vehicle_type_id
    WHERE sl.is_active = TRUE
    ORDER BY vt.type_name ASC, sl.total_seats ASC
  `);

  return { vehicleTypes };
}

export async function findDefaultSeatLayoutByVehicleType(
  vehicleTypeId: number,
) {
  const result = await query<any>(
    `
    SELECT seat_layout_id AS seatLayoutId, total_seats AS totalSeats
    FROM seat_layouts
    WHERE vehicle_type_id = ?
      AND is_active = TRUE
    ORDER BY created_at DESC
    LIMIT 1
    `,
    [vehicleTypeId],
  );

  return result[0] ?? null;
}

export async function countVehicleUsage(vehicleId: number) {
  const result = await query<{ tripCount: number; bookingCount: number }>(
    `
    SELECT
      COUNT(DISTINCT t.trip_id) AS tripCount,
      COUNT(DISTINCT b.booking_id) AS bookingCount
    FROM vehicles v
    LEFT JOIN trips t ON t.vehicle_id = v.vehicle_id
    LEFT JOIN bookings b ON b.trip_id = t.trip_id
    WHERE v.vehicle_id = ?
    `,
    [vehicleId],
  );

  return {
    tripCount: Number(result[0]?.tripCount ?? 0),
    bookingCount: Number(result[0]?.bookingCount ?? 0),
  };
}

export async function hasRunningTrip(vehicleId: number) {
  const result = await query<{ total: number }>(
    `
    SELECT COUNT(*) AS total
    FROM trips
    WHERE vehicle_id = ?
      AND status = 'RUNNING'
    `,
    [vehicleId],
  );

  return Number(result[0]?.total ?? 0) > 0;
}

export async function createVehicleRepo(data: CreateAdminVehiclePayload) {
  const layout = await findDefaultSeatLayoutByVehicleType(data.vehicleTypeId);

  if (!layout) {
    throw new Error("Loại xe này chưa có sơ đồ ghế khả dụng");
  }

  const result: any = await query(
    `
    INSERT INTO vehicles (
      internal_code,
      vehicle_type_id,
      seat_layout_id,
      license_plate,
      vehicle_name,
      status,
      note
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [
      data.internalCode,
      data.vehicleTypeId,
      layout.seatLayoutId,
      data.licensePlate,
      data.vehicleName || null,
      data.status || "AVAILABLE",
      data.note || null,
    ],
  );

  return { vehicleId: result.insertId };
}

export async function updateVehicleRepo(
  vehicleId: number,
  data: UpdateAdminVehiclePayload,
  isLocked: boolean,
) {
  if (isLocked) {
    await query(
      `
      UPDATE vehicles
      SET
        internal_code = ?,
        license_plate = ?,
        vehicle_name = ?,
        status = ?,
        note = ?
      WHERE vehicle_id = ?
      `,
      [
        data.internalCode,
        data.licensePlate,
        data.vehicleName || null,
        data.status,
        data.note || null,
        vehicleId,
      ],
    );

    return { vehicleId };
  }

  if (!data.vehicleTypeId) {
    throw new Error("Vui lòng chọn loại xe");
  }

  const layout = await findDefaultSeatLayoutByVehicleType(data.vehicleTypeId);

  if (!layout) {
    throw new Error("Loại xe này chưa có sơ đồ ghế khả dụng");
  }

  await query(
    `
    UPDATE vehicles
    SET
      internal_code = ?,
      vehicle_type_id = ?,
      seat_layout_id = ?,
      license_plate = ?,
      vehicle_name = ?,
      status = ?,
      note = ?
    WHERE vehicle_id = ?
    `,
    [
      data.internalCode,
      data.vehicleTypeId,
      layout.seatLayoutId,
      data.licensePlate,
      data.vehicleName || null,
      data.status,
      data.note || null,
      vehicleId,
    ],
  );

  return { vehicleId };
}

export async function updateVehicleStatusRepo(
  vehicleId: number,
  status: VehicleStatus,
) {
  await query(
    `
    UPDATE vehicles
    SET status = ?
    WHERE vehicle_id = ?
    `,
    [status, vehicleId],
  );

  return { vehicleId, status };
}
