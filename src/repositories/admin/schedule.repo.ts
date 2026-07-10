import { query } from "@/lib/server/mysql";

import type {
  AdminScheduleTemplateItem,
  AdminScheduleTemplateListParams,
  CreateAdminScheduleTemplatePayload,
  UpdateAdminScheduleTemplatePayload,
  GenerateTripsFromSchedulePayload,
} from "@/types/admin/schedules/schedule-management.type";

function formatDateOnly(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function shouldGenerateByRepeatType(date: Date, repeatType: string) {
  const day = date.getDay();

  if (repeatType === "DAILY") return true;
  if (repeatType === "WEEKLY") return day === 1;
  if (repeatType === "WEEKDAYS") return day >= 1 && day <= 5;
  if (repeatType === "WEEKENDS") return day === 0 || day === 6;

  return true;
}

export async function findScheduleTemplateForGenerate(
  scheduleTemplateId: number,
) {
  const sql = `
    SELECT
      schedule_template_id AS scheduleTemplateId,
      route_id AS routeId,
      departure_time AS departureTime,
      estimated_duration AS estimatedDuration,
      base_price AS basePrice,
      is_active AS isActive
    FROM schedule_templates
    WHERE schedule_template_id = ?
    LIMIT 1
  `;

  const result = await query<any>(sql, [scheduleTemplateId]);
  return result[0] || null;
}

export async function getVehicleTotalSeats(vehicleId?: number | null) {
  if (!vehicleId) return 40;

  const sql = `
    SELECT sl.total_seats AS totalSeats
    FROM vehicles v
    INNER JOIN seat_layouts sl ON sl.seat_layout_id = v.seat_layout_id
    WHERE v.vehicle_id = ?
    LIMIT 1
  `;

  const result = await query<{ totalSeats: number }>(sql, [vehicleId]);
  return Number(result[0]?.totalSeats ?? 40);
}

export async function checkGeneratedTripExists(
  routeId: number,
  departureDatetime: string,
) {
  const sql = `
    SELECT trip_id AS tripId
    FROM trips
    WHERE route_id = ?
      AND departure_datetime = ?
    LIMIT 1
  `;

  const result = await query<{ tripId: number }>(sql, [
    routeId,
    departureDatetime,
  ]);

  return !!result[0];
}

export async function createTripFromScheduleRepo(data: {
  scheduleTemplateId: number;
  routeId: number;
  vehicleId?: number | null;
  departureDatetime: string;
  arrivalDatetime: string;
  availableSeats: number;
  ticketPrice?: number | null;
}) {
  const sql = `
    INSERT INTO trips (
      schedule_template_id,
      route_id,
      vehicle_id,
      departure_datetime,
      arrival_datetime,
      available_seats,
      ticket_price,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, 'OPEN')
  `;

  await query(sql, [
    data.scheduleTemplateId,
    data.routeId,
    data.vehicleId || null,
    data.departureDatetime,
    data.arrivalDatetime,
    data.availableSeats,
    data.ticketPrice || null,
  ]);
}

export async function generateTripsFromScheduleRepo(
  payload: GenerateTripsFromSchedulePayload,
) {
  const template = await findScheduleTemplateForGenerate(
    payload.scheduleTemplateId,
  );

  if (!template) {
    throw new Error("Lịch chạy mẫu không tồn tại");
  }

  if (!template.isActive) {
    throw new Error("Lịch chạy mẫu đang tạm ngưng, không thể sinh chuyến");
  }

  const availableSeats = await getVehicleTotalSeats(payload.vehicleId);

  let createdCount = 0;
  let skippedCount = 0;

  let current = new Date(payload.dateFrom);
  const end = new Date(payload.dateTo);

  while (current <= end) {
    if (!shouldGenerateByRepeatType(current, payload.repeatType)) {
      current = addDays(current, 1);
      continue;
    }

    const dateText = formatDateOnly(current);
    const departureDatetime = `${dateText} ${template.departureTime}`;

    const arrivalDate = new Date(departureDatetime);
    arrivalDate.setMinutes(
      arrivalDate.getMinutes() + Number(template.estimatedDuration),
    );

    const arrivalDatetime = arrivalDate
      .toISOString()
      .slice(0, 19)
      .replace("T", " ");

    const exists = await checkGeneratedTripExists(
      template.routeId,
      departureDatetime,
    );

    if (exists) {
      skippedCount++;
      current = addDays(current, 1);
      continue;
    }

    await createTripFromScheduleRepo({
      scheduleTemplateId: template.scheduleTemplateId,
      routeId: template.routeId,
      vehicleId: payload.vehicleId || null,
      departureDatetime,
      arrivalDatetime,
      availableSeats,
      ticketPrice: payload.ticketPrice || template.basePrice,
    });

    createdCount++;
    current = addDays(current, 1);
  }

  return {
    createdCount,
    skippedCount,
  };
}
export async function findAdminScheduleTemplates(
  params: AdminScheduleTemplateListParams,
) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const offset = (page - 1) * limit;

  const keyword = params.keyword?.trim() ?? "";

  let whereSql = `
    WHERE
      (
        ? = ''
        OR oc.city_name LIKE ?
        OR dc.city_name LIKE ?
      )
  `;

  const values: any[] = [keyword, `%${keyword}%`, `%${keyword}%`];

  if (params.routeId) {
    whereSql += `
    AND EXISTS (
      SELECT 1
      FROM routes selected_route
      INNER JOIN routes same_route
        ON same_route.origin_city_id = selected_route.origin_city_id
       AND same_route.destination_city_id = selected_route.destination_city_id
      WHERE selected_route.route_id = ?
        AND same_route.route_id = st.route_id
    )
  `;
    values.push(params.routeId);
  }

  if (params.status) {
    whereSql += ` AND st.is_active = ?`;
    values.push(params.status === "ACTIVE" ? 1 : 0);
  }

  const itemsSql = `
    SELECT
      st.schedule_template_id AS scheduleTemplateId,

      st.route_id AS routeId,
      CONCAT(oc.city_name, ' → ', dc.city_name) AS routeName,
      oc.city_name AS originCityName,
      dc.city_name AS destinationCityName,

      TIME_FORMAT(st.departure_time, '%H:%i') AS departureTime,
      st.estimated_duration AS estimatedDuration,
      st.base_price AS basePrice,

      st.is_active AS isActive,

      COUNT(DISTINCT t.trip_id) AS tripCount,
      COUNT(
        DISTINCT CASE
          WHEN t.departure_datetime >= NOW()
          THEN t.trip_id
          ELSE NULL
        END
      ) AS upcomingTripCount,

      st.created_at AS createdAt
    FROM schedule_templates st
    INNER JOIN routes r ON r.route_id = st.route_id
    INNER JOIN cities oc ON oc.city_id = r.origin_city_id
    INNER JOIN cities dc ON dc.city_id = r.destination_city_id
    LEFT JOIN trips t ON t.schedule_template_id = st.schedule_template_id
    ${whereSql}
    GROUP BY
      st.schedule_template_id,
      st.route_id,
      oc.city_name,
      dc.city_name,
      st.departure_time,
      st.estimated_duration,
      st.base_price,
      st.is_active,
      st.created_at
    ORDER BY
      oc.city_name ASC,
      dc.city_name ASC,
      st.departure_time ASC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM schedule_templates st
    INNER JOIN routes r ON r.route_id = st.route_id
    INNER JOIN cities oc ON oc.city_id = r.origin_city_id
    INNER JOIN cities dc ON dc.city_id = r.destination_city_id
    ${whereSql}
  `;

  const items = await query<AdminScheduleTemplateItem>(itemsSql, [
    ...values,
    limit,
    offset,
  ]);

  const countResult = await query<{ total: number }>(countSql, values);

  const summary = await getScheduleTemplateSummary();

  return {
    items,
    total: countResult[0]?.total ?? 0,
    page,
    limit,
    summary,
  };
}

export async function getScheduleTemplateSummary() {
  const sql = `
    SELECT
      COUNT(*) AS totalSchedules,
      SUM(CASE WHEN is_active = TRUE THEN 1 ELSE 0 END) AS activeSchedules,
      SUM(CASE WHEN is_active = FALSE THEN 1 ELSE 0 END) AS inactiveSchedules,
      SUM(
        CASE
          WHEN EXISTS (
            SELECT 1
            FROM trips t
            WHERE t.schedule_template_id = schedule_templates.schedule_template_id
          )
          THEN 1
          ELSE 0
        END
      ) AS usedSchedules
    FROM schedule_templates
  `;

  const result = await query<any>(sql);
  const row = result[0] ?? {};

  return {
    totalSchedules: Number(row.totalSchedules ?? 0),
    activeSchedules: Number(row.activeSchedules ?? 0),
    inactiveSchedules: Number(row.inactiveSchedules ?? 0),
    usedSchedules: Number(row.usedSchedules ?? 0),
  };
}

export async function findScheduleTemplateById(scheduleTemplateId: number) {
  const sql = `
    SELECT
      st.schedule_template_id AS scheduleTemplateId,
      st.route_id AS routeId,
      CONCAT(oc.city_name, ' → ', dc.city_name) AS routeName,
      TIME_FORMAT(st.departure_time, '%H:%i') AS departureTime,
      st.estimated_duration AS estimatedDuration,
      st.base_price AS basePrice,
      st.is_active AS isActive,
      COUNT(DISTINCT t.trip_id) AS tripCount
    FROM schedule_templates st
    INNER JOIN routes r ON r.route_id = st.route_id
    INNER JOIN cities oc ON oc.city_id = r.origin_city_id
    INNER JOIN cities dc ON dc.city_id = r.destination_city_id
    LEFT JOIN trips t ON t.schedule_template_id = st.schedule_template_id
    WHERE st.schedule_template_id = ?
    GROUP BY
      st.schedule_template_id,
      st.route_id,
      oc.city_name,
      dc.city_name,
      st.departure_time,
      st.estimated_duration,
      st.base_price,
      st.is_active
    LIMIT 1
  `;

  const result = await query<any>(sql, [scheduleTemplateId]);
  return result[0] || null;
}

export async function createScheduleTemplateRepo(
  data: CreateAdminScheduleTemplatePayload,
) {
  const sql = `
    INSERT INTO schedule_templates (
      route_id,
      departure_time,
      estimated_duration,
      base_price,
      is_active
    )
    VALUES (?, ?, ?, ?, TRUE)
  `;

  const result: any = await query(sql, [
    data.routeId,
    data.departureTime,
    data.estimatedDuration,
    data.basePrice,
  ]);

  return {
    scheduleTemplateId: result.insertId,
  };
}

export async function updateScheduleTemplateRepo(
  scheduleTemplateId: number,
  data: UpdateAdminScheduleTemplatePayload,
) {
  const sql = `
    UPDATE schedule_templates
    SET
      departure_time = ?,
      estimated_duration = ?,
      base_price = ?
    WHERE schedule_template_id = ?
  `;

  await query(sql, [
    data.departureTime,
    data.estimatedDuration,
    data.basePrice,
    scheduleTemplateId,
  ]);

  return { scheduleTemplateId };
}

export async function updateScheduleTemplateStatusRepo(
  scheduleTemplateId: number,
  isActive: boolean,
) {
  const sql = `
    UPDATE schedule_templates
    SET is_active = ?
    WHERE schedule_template_id = ?
  `;

  await query(sql, [isActive ? 1 : 0, scheduleTemplateId]);

  return {
    scheduleTemplateId,
    isActive,
  };
}
export async function findAdminScheduleOptions() {
  const routes = await query<any>(`
  SELECT
    MIN(r.route_id) AS routeId,
    CONCAT(oc.city_name, ' → ', dc.city_name) AS routeName
  FROM routes r
  INNER JOIN cities oc ON oc.city_id = r.origin_city_id
  INNER JOIN cities dc ON dc.city_id = r.destination_city_id
  WHERE r.status = 'ACTIVE'
  GROUP BY
    r.origin_city_id,
    r.destination_city_id,
    oc.city_name,
    dc.city_name
  ORDER BY oc.city_name ASC, dc.city_name ASC
`);

  const vehicles = await query<any>(`
    SELECT
      v.vehicle_id AS vehicleId,
      v.license_plate AS licensePlate,
      vt.type_name AS vehicleTypeName
    FROM vehicles v
    INNER JOIN vehicle_types vt ON vt.vehicle_type_id = v.vehicle_type_id
    ORDER BY v.license_plate ASC
  `);

  const scheduleTemplates = await query<any>(`
  SELECT
    st.schedule_template_id AS scheduleTemplateId,
    st.route_id AS routeId,
    CONCAT(
      oc.city_name,
      ' → ',
      dc.city_name,
      ' - ',
      TIME_FORMAT(st.departure_time, '%H:%i')
    ) AS scheduleName
  FROM schedule_templates st
  INNER JOIN routes r ON r.route_id = st.route_id
  INNER JOIN cities oc ON oc.city_id = r.origin_city_id
  INNER JOIN cities dc ON dc.city_id = r.destination_city_id
  WHERE st.is_active = TRUE
  ORDER BY oc.city_name ASC, dc.city_name ASC, st.departure_time ASC
`);

  return {
    routes,
    vehicles,
    scheduleTemplates,
  };
}
