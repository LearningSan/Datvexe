import { query, withTransaction } from "@/lib/server/mysql";

import type {
  AdminTripItem,
  AdminTripListParams,
  CreateAdminTripPayload,
  UpdateAdminTripPayload,
  TripStatus,
  BulkUpdateTripPricePayload,
  CopyTripsPayload,
} from "@/types/admin/trips/trip-management.type";

export async function findTripsByDateForCopy(payload: CopyTripsPayload) {
  let sql = `
    SELECT
      t.trip_id AS tripId,
      t.schedule_template_id AS scheduleTemplateId,
      t.route_id AS routeId,
      t.vehicle_id AS vehicleId,
      t.departure_datetime AS departureDatetime,
      t.arrival_datetime AS arrivalDatetime,
      COALESCE(sl.total_seats, t.available_seats) AS totalSeats,
      t.ticket_price AS ticketPrice,
      t.status
    FROM trips t
    LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
    LEFT JOIN seat_layouts sl ON sl.seat_layout_id = v.seat_layout_id
    WHERE DATE(t.departure_datetime) = ?
      AND t.status <> 'CANCELLED'
  `;

  const params: any[] = [payload.sourceDate];

  if (payload.routeId) {
    sql += `
      AND t.route_id IN (
        SELECT same_route.route_id
        FROM routes selected_route
        INNER JOIN routes same_route
          ON same_route.origin_city_id = selected_route.origin_city_id
         AND same_route.destination_city_id = selected_route.destination_city_id
        WHERE selected_route.route_id = ?
      )
    `;
    params.push(payload.routeId);
  }

  sql += ` ORDER BY t.departure_datetime ASC`;

  return await query<any>(sql, params);
}

export async function findTripExistsByRouteAndTime(
  routeId: number,
  departureDatetime: string,
) {
  const sql = `
    SELECT
      t.trip_id AS tripId,
      COUNT(b.booking_id) AS bookingCount
    FROM trips t
    LEFT JOIN bookings b
      ON b.trip_id = t.trip_id
     AND b.status IN ('PENDING', 'CONFIRMED')
    WHERE t.route_id = ?
      AND t.departure_datetime = ?
    GROUP BY t.trip_id
    LIMIT 1
  `;

  const result = await query<any>(sql, [routeId, departureDatetime]);
  return result[0] ?? null;
}
export async function updateCopiedTripRepo(data: {
  tripId: number;
  vehicleId?: number | null;
  availableSeats: number;
  ticketPrice?: number | null;
}) {
  await query(
    `
    UPDATE trips
    SET
      vehicle_id = ?,
      available_seats = ?,
      ticket_price = ?,
      status = 'OPEN'
    WHERE trip_id = ?
    `,
    [
      data.vehicleId || null,
      data.availableSeats,
      data.ticketPrice ?? null,
      data.tripId,
    ],
  );
}
export async function createCopiedTripRepo(data: {
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

function toDateText(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
export async function copyTripsRepo(payload: CopyTripsPayload) {
  const sourceTrips = await findTripsByDateForCopy(payload);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  const startDate = new Date(payload.targetDateFrom);
  const endDate = new Date(payload.targetDateTo);

  let current = startDate;

  while (current <= endDate) {
    const targetDate = toDateText(current);

    for (const trip of sourceTrips) {
      const sourceDeparture = new Date(trip.departureDatetime);
      const sourceArrival = new Date(trip.arrivalDatetime);

      const departureTime = sourceDeparture.toTimeString().slice(0, 8);
      const arrivalTime = sourceArrival.toTimeString().slice(0, 8);

      const targetDeparture = `${targetDate} ${departureTime}`;
      const targetArrival = `${targetDate} ${arrivalTime}`;

      const nextVehicleId = payload.keepVehicle ? trip.vehicleId : null;

      const totalSeats = nextVehicleId
        ? await getVehicleTotalSeatsForCopy(nextVehicleId)
        : Number(trip.totalSeats ?? 40);

      const nextTicketPrice = payload.keepPrice ? trip.ticketPrice : null;

      const existing = await findTripExistsByRouteAndTime(
        trip.routeId,
        targetDeparture,
      );

      if (existing) {
        if (!payload.overwriteExisting) {
          skippedCount++;
          continue;
        }

        if (Number(existing.bookingCount) > 0) {
          skippedCount++;
          continue;
        }

        await updateCopiedTripRepo({
          tripId: existing.tripId,
          vehicleId: nextVehicleId,
          availableSeats: totalSeats,
          ticketPrice: nextTicketPrice,
        });

        updatedCount++;
        continue;
      }

      await createCopiedTripRepo({
        scheduleTemplateId: trip.scheduleTemplateId,
        routeId: trip.routeId,
        vehicleId: nextVehicleId,
        departureDatetime: targetDeparture,
        arrivalDatetime: targetArrival,
        availableSeats: totalSeats,
        ticketPrice: nextTicketPrice,
      });

      createdCount++;
    }

    current = addDays(current, 1);
  }

  return {
    createdCount,
    updatedCount,
    skippedCount,
  };
}

export async function bulkUpdateTripPriceRepo(
  payload: BulkUpdateTripPricePayload,
) {
  let whereSql = `
    WHERE DATE(t.departure_datetime) BETWEEN ? AND ?
      AND t.status IN ('OPEN', 'FULL')
  `;

  const whereParams: any[] = [payload.dateFrom, payload.dateTo];

  if (payload.routeId) {
    whereSql += `
      AND t.route_id IN (
        SELECT same_route.route_id
        FROM routes selected_route
        INNER JOIN routes same_route
          ON same_route.origin_city_id = selected_route.origin_city_id
         AND same_route.destination_city_id = selected_route.destination_city_id
        WHERE selected_route.route_id = ?
      )
    `;

    whereParams.push(payload.routeId);
  }

  let sql = "";
  let params: any[] = [];

  if (payload.priceMode === "FIXED") {
    sql = `
      UPDATE trips t
      INNER JOIN routes r ON r.route_id = t.route_id
      LEFT JOIN schedule_templates st
        ON st.schedule_template_id = t.schedule_template_id
      SET t.ticket_price = ?
      ${whereSql}
    `;

    params = [payload.priceValue, ...whereParams];
  } else {
    sql = `
      UPDATE trips t
      INNER JOIN routes r ON r.route_id = t.route_id
      LEFT JOIN schedule_templates st
        ON st.schedule_template_id = t.schedule_template_id
      SET t.ticket_price = ROUND(
        COALESCE(NULLIF(t.ticket_price, 0), st.base_price, r.base_price, 0)
        * (1 + ? / 100),
        0
      )
      ${whereSql}
    `;

    params = [payload.priceValue, ...whereParams];
  }

  const result: any = await query(sql, params);

  return {
    updatedCount: result.affectedRows ?? 0,
  };
}
export async function findAdminTrips(params: AdminTripListParams) {
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
        OR v.license_plate LIKE ?
        OR v.vehicle_name LIKE ?
        OR driver_users.full_name LIKE ?
      )
  `;

  const values: any[] = [
    keyword,
    `%${keyword}%`,
    `%${keyword}%`,
    `%${keyword}%`,
    `%${keyword}%`,
    `%${keyword}%`,
  ];

  if (!params.status && params.warning !== "CANCELLED") {
    whereSql += ` AND t.status <> 'CANCELLED'`;
  }

  if (params.date) {
    whereSql += ` AND DATE(t.departure_datetime) = ?`;
    values.push(params.date);
  }

  if (params.routeId) {
    whereSql += ` AND t.route_id = ?`;
    values.push(params.routeId);
  }

  if (params.vehicleId) {
    whereSql += ` AND t.vehicle_id = ?`;
    values.push(params.vehicleId);
  }

  if (params.driverId) {
    whereSql += `
      AND EXISTS (
        SELECT 1
        FROM trip_drivers td_filter
        WHERE td_filter.trip_id = t.trip_id
          AND td_filter.driver_id = ?
      )
    `;
    values.push(params.driverId);
  }

  if (params.status) {
    whereSql += ` AND t.status = ?`;
    values.push(params.status);
  }

  if (params.warning === "NO_VEHICLE") {
    whereSql += ` AND t.vehicle_id IS NULL`;
  }

  if (params.warning === "NO_DRIVER") {
    whereSql += `
      AND NOT EXISTS (
        SELECT 1
        FROM trip_drivers td_warning
        WHERE td_warning.trip_id = t.trip_id
      )
    `;
  }

  if (params.warning === "DEPARTING_SOON") {
    whereSql += `
      AND t.status = 'OPEN'
      AND t.departure_datetime BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 4 HOUR)
    `;
  }

  if (params.warning === "FULL_SEAT") {
    whereSql += ` AND t.available_seats = 0`;
  }

  if (params.warning === "CANCELLED") {
    whereSql += ` AND t.status = 'CANCELLED'`;
  }
  const baseFromSql = `
  FROM trips t
  INNER JOIN routes r ON r.route_id = t.route_id
  LEFT JOIN schedule_templates st
    ON st.schedule_template_id = t.schedule_template_id
  INNER JOIN cities oc ON oc.city_id = r.origin_city_id
  INNER JOIN cities dc ON dc.city_id = r.destination_city_id
  LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
  LEFT JOIN vehicle_types vt ON vt.vehicle_type_id = v.vehicle_type_id
  LEFT JOIN seat_layouts sl ON sl.seat_layout_id = v.seat_layout_id
  LEFT JOIN trip_drivers td ON td.trip_id = t.trip_id
  LEFT JOIN drivers d ON d.driver_id = td.driver_id
  LEFT JOIN users driver_users ON driver_users.user_id = d.user_id
`;

  const itemsSql = `
    SELECT
      t.trip_id AS tripId,

      t.route_id AS routeId,
      CONCAT(oc.city_name, ' → ', dc.city_name) AS routeName,
      oc.city_name AS originCityName,
      dc.city_name AS destinationCityName,

      t.schedule_template_id AS scheduleTemplateId,

      t.vehicle_id AS vehicleId,
      v.vehicle_name AS vehicleName,
      v.license_plate AS licensePlate,
      vt.type_name AS vehicleTypeName,

      GROUP_CONCAT(DISTINCT driver_users.full_name SEPARATOR ', ') AS driverNames,
MAX(CASE WHEN td.assigned_role = 'MAIN' THEN d.driver_id END) AS mainDriverId,
      t.departure_datetime AS departureDatetime,
      t.arrival_datetime AS arrivalDatetime,

      DATE_FORMAT(t.departure_datetime, '%Y-%m-%d') AS departureDate,
      DATE_FORMAT(t.departure_datetime, '%H:%i') AS departureTime,

      COALESCE(sl.total_seats, t.available_seats) AS totalSeats,
      t.available_seats AS availableSeats,
      GREATEST(COALESCE(sl.total_seats, t.available_seats) - t.available_seats, 0) AS bookedSeats,
COALESCE(
  NULLIF(t.ticket_price, 0),
  st.base_price,
  r.base_price
) AS ticketPrice,
      t.status,

      COUNT(DISTINCT b.booking_id) AS bookingCount,

      t.created_at AS createdAt
    ${baseFromSql}
    LEFT JOIN bookings b ON b.trip_id = t.trip_id
    ${whereSql}
    GROUP BY
      t.trip_id,
      t.route_id,
      oc.city_name,
      dc.city_name,
      t.schedule_template_id,
      t.vehicle_id,
      v.vehicle_name,
      v.license_plate,
      vt.type_name,
      t.departure_datetime,
      t.arrival_datetime,
      sl.total_seats,
      t.available_seats,
      t.ticket_price,
st.base_price,
r.base_price,
      t.status,
      t.created_at
    ORDER BY
      DATE(t.departure_datetime) ASC,
      oc.city_name ASC,
      dc.city_name ASC,
      t.departure_datetime ASC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(DISTINCT t.trip_id) AS total
    ${baseFromSql}
    ${whereSql}
  `;

  const itemsRaw = await query<Omit<AdminTripItem, "warnings">>(itemsSql, [
    ...values,
    limit,
    offset,
  ]);

  const countResult = await query<{ total: number }>(countSql, values);

  const items: AdminTripItem[] = itemsRaw.map((item) => ({
    ...item,
    warnings: buildTripWarnings(item),
  }));

  const summary = await getTripSummary();

  return {
    items,
    total: countResult[0]?.total ?? 0,
    page,
    limit,
    summary,
  };
}

function buildTripWarnings(item: Omit<AdminTripItem, "warnings">) {
  const warnings: AdminTripItem["warnings"] = [];

  if (!item.vehicleId) warnings.push("NO_VEHICLE");
  if (!item.driverNames) warnings.push("NO_DRIVER");
  if (item.availableSeats <= 0) warnings.push("FULL_SEAT");
  if (item.status === "CANCELLED") warnings.push("CANCELLED");

  const departureTime = new Date(item.departureDatetime).getTime();
  const now = Date.now();
  const fourHours = 4 * 60 * 60 * 1000;

  if (
    item.status === "OPEN" &&
    departureTime > now &&
    departureTime - now <= fourHours
  ) {
    warnings.push("DEPARTING_SOON");
  }

  return warnings;
}

export async function getTripSummary() {
  const sql = `
    SELECT
      COUNT(*) AS totalTrips,
      SUM(CASE WHEN status = 'OPEN' THEN 1 ELSE 0 END) AS openTrips,
      SUM(CASE WHEN status = 'RUNNING' THEN 1 ELSE 0 END) AS runningTrips,
      SUM(CASE WHEN status = 'CANCELLED' THEN 1 ELSE 0 END) AS cancelledTrips,
      SUM(CASE WHEN vehicle_id IS NULL THEN 1 ELSE 0 END) AS noVehicleTrips,
      SUM(
        CASE
          WHEN NOT EXISTS (
            SELECT 1
            FROM trip_drivers td
            WHERE td.trip_id = trips.trip_id
          )
          THEN 1
          ELSE 0
        END
      ) AS noDriverTrips,
      SUM(
        CASE
          WHEN status = 'OPEN'
            AND departure_datetime BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 4 HOUR)
          THEN 1
          ELSE 0
        END
      ) AS departingSoonTrips
    FROM trips
    WHERE DATE(departure_datetime) = CURDATE()
  `;

  const result = await query<any>(sql);
  const row = result[0] ?? {};

  return {
    totalTrips: Number(row.totalTrips ?? 0),
    openTrips: Number(row.openTrips ?? 0),
    runningTrips: Number(row.runningTrips ?? 0),
    cancelledTrips: Number(row.cancelledTrips ?? 0),
    noVehicleTrips: Number(row.noVehicleTrips ?? 0),
    noDriverTrips: Number(row.noDriverTrips ?? 0),
    departingSoonTrips: Number(row.departingSoonTrips ?? 0),
  };
}

export async function findAdminTripById(tripId: number) {
  const result = await findAdminTrips({
    keyword: "",
    page: 1,
    limit: 1,
  });

  return result.items.find((item) => item.tripId === tripId) ?? null;
}

export async function countBookingsByTrip(tripId: number) {
  const sql = `
    SELECT COUNT(*) AS total
    FROM bookings
    WHERE trip_id = ?
      AND status IN ('PENDING', 'CONFIRMED')
  `;

  const result = await query<{ total: number }>(sql, [tripId]);

  return Number(result[0]?.total ?? 0);
}

export async function createAdminTripRepo(data: CreateAdminTripPayload) {
  return await withTransaction(async (conn) => {
    const [tripResult]: any = await conn.execute(
      `
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
      `,
      [
        data.scheduleTemplateId,
        data.routeId,
        data.vehicleId || null,
        data.departureDatetime,
        data.arrivalDatetime,
        data.availableSeats,
        data.ticketPrice ?? null,
      ],
    );

    const tripId = tripResult.insertId;

    if (data.driverId) {
      await conn.execute(
        `
        INSERT INTO trip_drivers (
          trip_id,
          driver_id,
          assigned_role
        )
        VALUES (?, ?, 'MAIN')
        `,
        [tripId, data.driverId],
      );
    }

    return { tripId };
  });
}

export async function updateAdminTripRepo(
  tripId: number,
  data: UpdateAdminTripPayload,
) {
  return await withTransaction(async (conn) => {
    await conn.execute(
      `
      UPDATE trips
      SET
        vehicle_id = ?,
        departure_datetime = ?,
        arrival_datetime = ?,
        ticket_price = ?,
        status = ?
      WHERE trip_id = ?
      `,
      [
        data.vehicleId || null,
        data.departureDatetime,
        data.arrivalDatetime,
        data.ticketPrice ?? null,
        data.status,
        tripId,
      ],
    );

    await conn.execute(
      `
      DELETE FROM trip_drivers
      WHERE trip_id = ?
        AND assigned_role = 'MAIN'
      `,
      [tripId],
    );

    if (data.driverId) {
      await conn.execute(
        `
        INSERT INTO trip_drivers (
          trip_id,
          driver_id,
          assigned_role
        )
        VALUES (?, ?, 'MAIN')
        `,
        [tripId, data.driverId],
      );
    }

    return { tripId };
  });
}
export async function updateTripStatusRepo(tripId: number, status: TripStatus) {
  const sql = `
    UPDATE trips
    SET status = ?
    WHERE trip_id = ?
  `;

  await query(sql, [status, tripId]);

  return { tripId, status };
}

export async function findAdminTripOptions() {
  const routes = await query<any>(`
    SELECT
      r.route_id AS routeId,
      CONCAT(oc.city_name, ' → ', dc.city_name) AS routeName
    FROM routes r
    INNER JOIN cities oc ON oc.city_id = r.origin_city_id
    INNER JOIN cities dc ON dc.city_id = r.destination_city_id
    WHERE r.status = 'ACTIVE'
    ORDER BY oc.city_name ASC, dc.city_name ASC
  `);

  const vehicles = await query<any>(`
    SELECT
      v.vehicle_id AS vehicleId,
      v.vehicle_name AS vehicleName,
      v.license_plate AS licensePlate,
      vt.type_name AS vehicleTypeName,
      sl.total_seats AS totalSeats,
      v.status
    FROM vehicles v
    INNER JOIN vehicle_types vt ON vt.vehicle_type_id = v.vehicle_type_id
    INNER JOIN seat_layouts sl ON sl.seat_layout_id = v.seat_layout_id
    ORDER BY v.status ASC, v.license_plate ASC
  `);

  const drivers = await query<any>(`
    SELECT
      d.driver_id AS driverId,
      u.full_name AS fullName,
      d.license_number AS licenseNumber,
      d.status
    FROM drivers d
    INNER JOIN users u ON u.user_id = d.user_id
    ORDER BY d.status ASC, u.full_name ASC
  `);

  const scheduleTemplates = await query<any>(`
    SELECT
      st.schedule_template_id AS scheduleTemplateId,
      st.route_id AS routeId,
      CONCAT(oc.city_name, ' → ', dc.city_name, ' - ', TIME_FORMAT(st.departure_time, '%H:%i')) AS scheduleName,
      st.departure_time AS departureTime,
      st.estimated_duration AS estimatedDuration,
      st.base_price AS basePrice
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
    drivers,
    scheduleTemplates,
  };
}
export async function getVehicleTotalSeatsForCopy(vehicleId?: number | null) {
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
