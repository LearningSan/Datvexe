import { query } from "@/lib/server/mysql";
import type {
  AdminPickupPointItem,
  AdminPickupPointListParams,
  CreateAdminPickupPointPayload,
  UpdateAdminPickupPointPayload,
  AdminPickupPointLinkedRoute,
} from "@/types/admin/pickup-points/pickup-point-management.type";
import type {
  AdminCityOption,
  AdminZoneOption,
} from "@/types/admin/pickup-points/pickup-point-option.type";

export async function findAdminCityOptions() {
  const sql = `
    SELECT
      city_id AS cityId,
      city_name AS cityName
    FROM cities
    ORDER BY city_name ASC
  `;

  return await query<AdminCityOption>(sql);
}

export async function findAdminZoneOptions(cityId?: number) {
  let sql = `
    SELECT
      zone_id AS zoneId,
      city_id AS cityId,
      zone_name AS zoneName,
      zone_type AS zoneType
    FROM zones
    WHERE 1 = 1
  `;

  const params: any[] = [];

  if (cityId) {
    sql += ` AND city_id = ?`;
    params.push(cityId);
  }

  sql += `
    ORDER BY
      CASE
        WHEN zone_type = 'HUB' THEN 1
        WHEN zone_type = 'DISTRICT' THEN 2
        ELSE 3
      END ASC,
      zone_name ASC
  `;

  return await query<AdminZoneOption>(sql, params);
}
export async function findAdminPickupPoints(
  params: AdminPickupPointListParams,
) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const offset = (page - 1) * limit;

  const keyword = params.keyword?.trim() ?? "";

  let whereSql = `
    WHERE
      (
        ? = ''
        OR pp.point_name LIKE ?
        OR pp.address LIKE ?
        OR c.city_name LIKE ?
        OR z.zone_name LIKE ?
      )
  `;

  const values: any[] = [
    keyword,
    `%${keyword}%`,
    `%${keyword}%`,
    `%${keyword}%`,
    `%${keyword}%`,
  ];

  if (params.cityId) {
    whereSql += ` AND pp.city_id = ?`;
    values.push(params.cityId);
  }

  if (params.zoneId) {
    whereSql += ` AND pp.zone_id = ?`;
    values.push(params.zoneId);
  }

  if (params.pointCategory) {
    whereSql += ` AND pp.point_category = ?`;
    values.push(params.pointCategory);
  }

  if (params.status) {
    whereSql += ` AND pp.is_active = ?`;
    values.push(params.status === "ACTIVE" ? 1 : 0);
  }

  if (params.warning === "MISSING_ROUTE") {
    whereSql += `
      AND NOT EXISTS (
        SELECT 1
        FROM trip_pickup_points tpp_check
        WHERE tpp_check.pickup_point_id = pp.pickup_point_id
      )
    `;
  }

  if (params.warning === "NO_COORDINATE") {
    whereSql += `
      AND (pp.latitude IS NULL OR pp.longitude IS NULL)
    `;
  }

  if (params.warning === "INACTIVE") {
    whereSql += ` AND pp.is_active = FALSE`;
  }

  if (params.usageType === "PICKUP") {
    whereSql += `
      AND EXISTS (
        SELECT 1
        FROM trip_pickup_points tpp_filter
        WHERE tpp_filter.pickup_point_id = pp.pickup_point_id
          AND tpp_filter.stop_type IN ('PICKUP', 'BOTH')
      )
    `;
  }

  if (params.usageType === "DROP_OFF") {
    whereSql += `
      AND EXISTS (
        SELECT 1
        FROM trip_pickup_points tpp_filter
        WHERE tpp_filter.pickup_point_id = pp.pickup_point_id
          AND tpp_filter.stop_type IN ('DROP_OFF', 'BOTH')
      )
    `;
  }

  if (params.usageType === "BOTH") {
    whereSql += `
      AND EXISTS (
        SELECT 1
        FROM trip_pickup_points tpp_filter
        WHERE tpp_filter.pickup_point_id = pp.pickup_point_id
          AND tpp_filter.stop_type = 'BOTH'
      )
    `;
  }

  if (params.usageType === "SHUTTLE") {
    whereSql += ` AND pp.point_category = 'SHUTTLE_AREA'`;
  }

  const itemsSql = `
    SELECT
      pp.pickup_point_id AS pickupPointId,
      pp.point_name AS pointName,
      pp.address,
      pp.city_id AS cityId,
      c.city_name AS cityName,
      pp.zone_id AS zoneId,
      z.zone_name AS zoneName,
      pp.point_category AS pointCategory,
      pp.latitude,
      pp.longitude,
      pp.is_active AS isActive,

      COUNT(DISTINCT tpp.trip_id) AS linkedTripCount,
      COUNT(DISTINCT b.booking_id) AS bookingCount,

      COUNT(DISTINCT CASE
        WHEN tpp.stop_type IN ('PICKUP', 'BOTH')
        THEN tpp.trip_id
      END) AS pickupTripCount,

      COUNT(DISTINCT CASE
        WHEN tpp.stop_type IN ('DROP_OFF', 'BOTH')
        THEN tpp.trip_id
      END) AS dropoffTripCount,

      COUNT(DISTINCT CASE
        WHEN b.pickup_point_id = pp.pickup_point_id
        THEN b.booking_id
      END) AS pickupBookingCount,

      COUNT(DISTINCT CASE
        WHEN b.dropoff_point_id = pp.pickup_point_id
        THEN b.booking_id
      END) AS dropoffBookingCount,

      MAX(b.created_at) AS lastUsedAt,
      pp.created_at AS createdAt
    FROM pickup_points pp
    INNER JOIN cities c ON c.city_id = pp.city_id
    INNER JOIN zones z ON z.zone_id = pp.zone_id
    LEFT JOIN trip_pickup_points tpp
      ON tpp.pickup_point_id = pp.pickup_point_id
    LEFT JOIN bookings b
      ON b.pickup_point_id = pp.pickup_point_id
      OR b.dropoff_point_id = pp.pickup_point_id
    ${whereSql}
    GROUP BY
      pp.pickup_point_id,
      pp.point_name,
      pp.address,
      pp.city_id,
      c.city_name,
      pp.zone_id,
      z.zone_name,
      pp.point_category,
      pp.latitude,
      pp.longitude,
      pp.is_active,
      pp.created_at
    ORDER BY
      c.city_name ASC,
      z.zone_name ASC,
      CASE
        WHEN pp.is_active = TRUE THEN 1
        ELSE 2
      END ASC,
      CASE
        WHEN COUNT(DISTINCT tpp.trip_id) = 0 THEN 1
        ELSE 2
      END ASC,
      pp.point_name ASC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM pickup_points pp
    INNER JOIN cities c ON c.city_id = pp.city_id
    INNER JOIN zones z ON z.zone_id = pp.zone_id
    ${whereSql}
  `;

  const items = await query<AdminPickupPointItem>(itemsSql, [
    ...values,
    limit,
    offset,
  ]);

  const countResult = await query<{ total: number }>(countSql, values);

  const summary = await getPickupPointSummary();

  return {
    items,
    total: countResult[0]?.total ?? 0,
    page,
    limit,
    summary,
  };
}
export async function getPickupPointSummary() {
  const sql = `
    SELECT
      COUNT(*) AS totalPoints,
      SUM(CASE WHEN pp.is_active = TRUE THEN 1 ELSE 0 END) AS activePoints,
      SUM(CASE WHEN pp.is_active = FALSE THEN 1 ELSE 0 END) AS inactivePoints,
      SUM(
        CASE
          WHEN NOT EXISTS (
            SELECT 1
            FROM trip_pickup_points tpp
            WHERE tpp.pickup_point_id = pp.pickup_point_id
          )
          THEN 1
          ELSE 0
        END
      ) AS missingConfigPoints,
      SUM(
        CASE
          WHEN pp.latitude IS NULL OR pp.longitude IS NULL
          THEN 1
          ELSE 0
        END
      ) AS noCoordinatePoints
    FROM pickup_points pp
  `;

  const result = await query<any>(sql);
  const row = result[0] ?? {};

  return {
    totalPoints: Number(row.totalPoints ?? 0),
    activePoints: Number(row.activePoints ?? 0),
    inactivePoints: Number(row.inactivePoints ?? 0),
    missingConfigPoints: Number(row.missingConfigPoints ?? 0),
    noCoordinatePoints: Number(row.noCoordinatePoints ?? 0),
  };
}

export async function findPickupPointById(pickupPointId: number) {
  const sql = `
    SELECT
      pp.pickup_point_id AS pickupPointId,
      pp.point_name AS pointName,
      pp.address,
      pp.city_id AS cityId,
      c.city_name AS cityName,
      pp.zone_id AS zoneId,
      z.zone_name AS zoneName,
      pp.point_category AS pointCategory,
      pp.latitude,
      pp.longitude,
      pp.is_active AS isActive,
      COUNT(DISTINCT tpp.trip_id) AS linkedTripCount,
      COUNT(DISTINCT b.booking_id) AS bookingCount,
      MAX(b.created_at) AS lastUsedAt,
      pp.created_at AS createdAt
    FROM pickup_points pp
    INNER JOIN cities c ON c.city_id = pp.city_id
    INNER JOIN zones z ON z.zone_id = pp.zone_id
    LEFT JOIN trip_pickup_points tpp
      ON tpp.pickup_point_id = pp.pickup_point_id
    LEFT JOIN bookings b
      ON b.pickup_point_id = pp.pickup_point_id
      OR b.dropoff_point_id = pp.pickup_point_id
    WHERE pp.pickup_point_id = ?
    GROUP BY
      pp.pickup_point_id,
      pp.point_name,
      pp.address,
      pp.city_id,
      c.city_name,
      pp.zone_id,
      z.zone_name,
      pp.point_category,
      pp.latitude,
      pp.longitude,
      pp.is_active,
      pp.created_at
    LIMIT 1
  `;

  const result = await query<AdminPickupPointItem>(sql, [pickupPointId]);

  return result[0] || null;
}

export async function createPickupPointRepo(
  data: CreateAdminPickupPointPayload,
) {
  const sql = `
    INSERT INTO pickup_points (
      city_id,
      zone_id,
      point_category,
      point_name,
      address,
      latitude,
      longitude,
      is_active
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, TRUE)
  `;

  const result: any = await query(sql, [
    data.cityId,
    data.zoneId,
    data.pointCategory,
    data.pointName,
    data.address || null,
    data.latitude ?? null,
    data.longitude ?? null,
  ]);

  return {
    pickupPointId: result.insertId,
  };
}

export async function updatePickupPointRepo(
  pickupPointId: number,
  data: UpdateAdminPickupPointPayload,
) {
  const sql = `
    UPDATE pickup_points
    SET
      point_name = ?,
      address = ?,
      city_id = ?,
      zone_id = ?,
      point_category = ?,
      latitude = ?,
      longitude = ?
    WHERE pickup_point_id = ?
  `;

  await query(sql, [
    data.pointName,
    data.address || null,
    data.cityId,
    data.zoneId,
    data.pointCategory,
    data.latitude ?? null,
    data.longitude ?? null,
    pickupPointId,
  ]);

  return { pickupPointId };
}

export async function updatePickupPointSafeRepo(
  pickupPointId: number,
  data: Pick<UpdateAdminPickupPointPayload, "pointName" | "address">,
) {
  const sql = `
    UPDATE pickup_points
    SET
      point_name = ?,
      address = ?
    WHERE pickup_point_id = ?
  `;

  await query(sql, [data.pointName, data.address || null, pickupPointId]);

  return { pickupPointId };
}

export async function updatePickupPointStatusRepo(
  pickupPointId: number,
  isActive: boolean,
) {
  const sql = `
    UPDATE pickup_points
    SET is_active = ?
    WHERE pickup_point_id = ?
  `;

  await query(sql, [isActive ? 1 : 0, pickupPointId]);

  return {
    pickupPointId,
    isActive,
  };
}

export async function checkPickupPointUsed(pickupPointId: number) {
  const sql = `
    SELECT
      (
        SELECT COUNT(*)
        FROM trip_pickup_points
        WHERE pickup_point_id = ?
      ) AS tripUsageCount,

      (
        SELECT COUNT(*)
        FROM bookings
        WHERE pickup_point_id = ?
          OR dropoff_point_id = ?
      ) AS bookingUsageCount
  `;

  const result = await query<{
    tripUsageCount: number;
    bookingUsageCount: number;
  }>(sql, [pickupPointId, pickupPointId, pickupPointId]);

  const row = result[0];

  return {
    tripUsageCount: Number(row?.tripUsageCount ?? 0),
    bookingUsageCount: Number(row?.bookingUsageCount ?? 0),
    isUsed:
      Number(row?.tripUsageCount ?? 0) > 0 ||
      Number(row?.bookingUsageCount ?? 0) > 0,
  };
}

export async function findLinkedRoutesByPickupPoint(
  pickupPointId: number,
): Promise<AdminPickupPointLinkedRoute[]> {
  const sql = `
    SELECT
      r.route_id AS routeId,
      CONCAT(oc.city_name, ' → ', dc.city_name) AS routeName,
      tpp.stop_type AS stopType,
      COUNT(DISTINCT t.trip_id) AS tripCount,
      MIN(
        CASE
          WHEN t.departure_datetime >= NOW()
          THEN t.departure_datetime
          ELSE NULL
        END
      ) AS nearestDeparture
    FROM trip_pickup_points tpp
    INNER JOIN trips t ON t.trip_id = tpp.trip_id
    INNER JOIN routes r ON r.route_id = t.route_id
    INNER JOIN cities oc ON oc.city_id = r.origin_city_id
    INNER JOIN cities dc ON dc.city_id = r.destination_city_id
    WHERE tpp.pickup_point_id = ?
    GROUP BY
      r.route_id,
      oc.city_name,
      dc.city_name,
      tpp.stop_type
    ORDER BY tripCount DESC
  `;

  return await query<AdminPickupPointLinkedRoute>(sql, [pickupPointId]);
}
