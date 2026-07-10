import { query } from "@/lib/server/mysql";
import type {
  AdminRouteItem,
  AdminRouteListParams,
  AdminRoutePayload,
} from "@/types/admin/routes/route-management.type";

type RouteDbStatus = "ACTIVE" | "SUSPENDED";

type RouteLogActionType =
  | "CREATE"
  | "UPDATE"
  | "SUSPEND"
  | "ACTIVATE"
  | "REVERSE_CREATE";

function buildStatusHaving(status?: string) {
  if (!status) return "";

  return `HAVING routeStatus = '${status}'`;
}

function buildSortSql(sort?: string) {
  switch (sort) {
    case "OLDEST":
      return "r.created_at ASC";
    case "REVENUE_DESC":
      return "revenue DESC";
    case "BOOKING_DESC":
      return "bookingCount DESC";
    case "NEWEST":
    default:
      return "r.created_at DESC";
  }
}

export async function findAdminRoutes(params: AdminRouteListParams) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const offset = (page - 1) * limit;

  const keyword = params.keyword?.trim() ?? "";
  const originCityId = params.originCityId;
  const destinationCityId = params.destinationCityId;

  const whereParts: string[] = [
    `(
      ? = ''
      OR oc.city_name LIKE ?
      OR dc.city_name LIKE ?
      OR CONCAT(oc.city_name, ' ', dc.city_name) LIKE ?
    )`,
  ];

  const values: any[] = [
    keyword,
    `%${keyword}%`,
    `%${keyword}%`,
    `%${keyword}%`,
  ];

  if (originCityId) {
    whereParts.push("r.origin_city_id = ?");
    values.push(originCityId);
  }

  if (destinationCityId) {
    whereParts.push("r.destination_city_id = ?");
    values.push(destinationCityId);
  }

  const whereSql = whereParts.join(" AND ");
  const havingSql = buildStatusHaving(params.status);
  const orderSql = buildSortSql(params.sort);

  const baseSql = `
    FROM routes r
    INNER JOIN cities oc ON oc.city_id = r.origin_city_id
    INNER JOIN cities dc ON dc.city_id = r.destination_city_id
    LEFT JOIN zones oh ON oh.zone_id = r.origin_hub_id
    LEFT JOIN zones dh ON dh.zone_id = r.destination_hub_id
    LEFT JOIN schedule_templates st
      ON st.route_id = r.route_id
    LEFT JOIN trips t
      ON t.route_id = r.route_id
    LEFT JOIN bookings b
      ON b.trip_id = t.trip_id
      AND b.status IN ('PENDING', 'CONFIRMED')
    LEFT JOIN booking_seats bs
      ON bs.booking_id = b.booking_id
    WHERE ${whereSql}
    GROUP BY
      r.route_id,
      r.origin_city_id,
      r.destination_city_id,
      oc.city_name,
      dc.city_name,
      r.origin_hub_id,
      r.destination_hub_id,
      oh.zone_name,
      dh.zone_name,
      r.distance_km,
      r.estimated_duration,
      r.base_price,
      r.status,
      r.created_at
  `;

  const routeStatusCaseSql = `
    CASE
      WHEN r.status = 'SUSPENDED' THEN 'SUSPENDED'
      WHEN r.origin_hub_id IS NULL OR r.destination_hub_id IS NULL THEN 'MISSING_CONFIG'
      WHEN COUNT(DISTINCT st.schedule_template_id) = 0 THEN 'NO_SCHEDULE'
      ELSE 'ACTIVE'
    END
  `;

  const selectSql = `
    SELECT
      r.route_id AS routeId,
      r.origin_city_id AS originCityId,
      r.destination_city_id AS destinationCityId,
      oc.city_name AS originCityName,
      dc.city_name AS destinationCityName,
      r.origin_hub_id AS originHubId,
      r.destination_hub_id AS destinationHubId,
      oh.zone_name AS originHubName,
      dh.zone_name AS destinationHubName,
      r.distance_km AS distanceKm,
      r.estimated_duration AS estimatedDuration,
      r.base_price AS basePrice,
      r.status AS status,
      COUNT(DISTINCT st.schedule_template_id) AS scheduleCount,
      COUNT(DISTINCT t.trip_id) AS tripCount,
      COUNT(DISTINCT b.booking_id) AS bookingCount,
      COUNT(DISTINCT bs.booking_seat_id) AS soldTicketCount,
      COALESCE(SUM(b.total_amount), 0) AS revenue,
      CASE
        WHEN COUNT(DISTINCT t.trip_id) > 0 THEN TRUE
        ELSE FALSE
      END AS hasTrips,
      ${routeStatusCaseSql} AS routeStatus,
      r.created_at AS createdAt
    ${baseSql}
    ${havingSql}
    ORDER BY ${orderSql}
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM (
      SELECT
        r.route_id,
        ${routeStatusCaseSql} AS routeStatus
      ${baseSql}
      ${havingSql}
    ) x
  `;

  const items = await query<AdminRouteItem>(selectSql, [
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

export async function findAdminRouteOptions() {
  const cities = await query<{ id: number; name: string }>(`
    SELECT city_id AS id, city_name AS name
    FROM cities
    ORDER BY city_name ASC
  `);

  const hubs = await query<{ id: number; name: string; cityId: number }>(`
    SELECT zone_id AS id, zone_name AS name, city_id AS cityId
    FROM zones
    WHERE zone_type = 'HUB'
    ORDER BY zone_name ASC
  `);

  return { cities, hubs };
}

export async function findAdminRouteById(routeId: number) {
  const sql = `
    SELECT
      r.route_id AS routeId,
      r.origin_city_id AS originCityId,
      r.destination_city_id AS destinationCityId,
      r.origin_hub_id AS originHubId,
      r.destination_hub_id AS destinationHubId,
      r.distance_km AS distanceKm,
      r.estimated_duration AS estimatedDuration,
      r.base_price AS basePrice,
      r.status AS status,
      CASE
        WHEN COUNT(t.trip_id) > 0 THEN TRUE
        ELSE FALSE
      END AS hasTrips
    FROM routes r
    LEFT JOIN trips t ON t.route_id = r.route_id
    WHERE r.route_id = ?
    GROUP BY
      r.route_id,
      r.origin_city_id,
      r.destination_city_id,
      r.origin_hub_id,
      r.destination_hub_id,
      r.distance_km,
      r.estimated_duration,
      r.base_price,
      r.status
    LIMIT 1
  `;

  const result = await query<any>(sql, [routeId]);
  return result[0] ?? null;
}

export async function createAdminRouteRepo(data: AdminRoutePayload) {
  const existingRoute = await checkRouteExists(
    data.originHubId,
    data.destinationHubId,
  );

  if (existingRoute) {
    throw new Error("Tuyến xe với điểm đi và điểm đến này đã tồn tại");
  }
  const sql = `
    INSERT INTO routes (
      origin_city_id,
      destination_city_id,
      origin_hub_id,
      destination_hub_id,
      distance_km,
      estimated_duration,
      base_price,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result: any = await query(sql, [
    data.originCityId,
    data.destinationCityId,
    data.originHubId || null,
    data.destinationHubId || null,
    data.distanceKm,
    data.estimatedDuration,
    data.basePrice,
    data.status,
  ]);

  return { routeId: result.insertId };
}

export async function updateAdminRouteRepo(
  routeId: number,
  data: AdminRoutePayload,
  hasTrips: boolean,
) {
  if (hasTrips) {
    const sql = `
      UPDATE routes
      SET
        distance_km = ?,
        estimated_duration = ?,
        base_price = ?,
        status = ?
      WHERE route_id = ?
    `;

    await query(sql, [
      data.distanceKm,
      data.estimatedDuration,
      data.basePrice,
      data.status,
      routeId,
    ]);

    return { routeId, lockedFields: true };
  }

  const sql = `
    UPDATE routes
    SET
      origin_city_id = ?,
      destination_city_id = ?,
      origin_hub_id = ?,
      destination_hub_id = ?,
      distance_km = ?,
      estimated_duration = ?,
      base_price = ?,
      status = ?
    WHERE route_id = ?
  `;

  await query(sql, [
    data.originCityId,
    data.destinationCityId,
    data.originHubId || null,
    data.destinationHubId || null,
    data.distanceKm,
    data.estimatedDuration,
    data.basePrice,
    data.status,
    routeId,
  ]);

  return { routeId, lockedFields: false };
}

export async function updateAdminRouteStatusRepo(
  routeId: number,
  status: RouteDbStatus,
) {
  const sql = `
    UPDATE routes
    SET status = ?
    WHERE route_id = ?
  `;

  await query(sql, [status, routeId]);

  return { routeId, status };
}

export async function duplicateReverseRouteRepo(routeId: number) {
  const existing = await findAdminRouteById(routeId);

  if (!existing) {
    throw new Error("Tuyến xe không tồn tại");
  }

  const duplicateSql = `
    SELECT route_id AS routeId
    FROM routes
    WHERE
      origin_city_id = ?
      AND destination_city_id = ?
      AND (
        origin_hub_id <=> ?
        AND destination_hub_id <=> ?
      )
    LIMIT 1
  `;

  const duplicate = await query<{ routeId: number }>(duplicateSql, [
    existing.destinationCityId,
    existing.originCityId,
    existing.destinationHubId,
    existing.originHubId,
  ]);

  if (duplicate[0]) {
    throw new Error("Tuyến chiều ngược lại đã tồn tại");
  }

  const insertSql = `
    INSERT INTO routes (
      origin_city_id,
      destination_city_id,
      origin_hub_id,
      destination_hub_id,
      distance_km,
      estimated_duration,
      base_price,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE')
  `;

  const result: any = await query(insertSql, [
    existing.destinationCityId,
    existing.originCityId,
    existing.destinationHubId,
    existing.originHubId,
    existing.distanceKm,
    existing.estimatedDuration,
    existing.basePrice,
  ]);

  return { routeId: result.insertId };
}

export async function createRouteChangeLog(data: {
  routeId: number;
  changedBy?: number | null;
  actionType: RouteLogActionType;
  reason?: string | null;
  oldData?: any;
  newData?: any;
}) {
  const sql = `
    INSERT INTO route_change_logs (
      route_id,
      changed_by,
      action_type,
      reason,
      old_data,
      new_data
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  await query(sql, [
    data.routeId,
    data.changedBy ?? null,
    data.actionType,
    data.reason ?? null,
    data.oldData ? JSON.stringify(data.oldData) : null,
    data.newData ? JSON.stringify(data.newData) : null,
  ]);

  return { routeId: data.routeId };
}
async function checkRouteExists(
  originHubId?: number | null,
  destinationHubId?: number | null,
) {
  if (!originHubId || !destinationHubId) return null;

  const sql = `
    SELECT route_id AS routeId
    FROM routes
    WHERE origin_hub_id = ?
      AND destination_hub_id = ?
    LIMIT 1
  `;

  const result = await query<{ routeId: number }>(sql, [
    originHubId,
    destinationHubId,
  ]);

  return result[0] ?? null;
}
