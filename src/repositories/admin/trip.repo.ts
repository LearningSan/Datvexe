import {
  query,
  withTransaction,
  execute,
  connExecute,
  connQuery,
} from "@/lib/server/mysql";

import type {
  AdminTripItem,
  AdminTripListParams,
  CreateAdminTripPayload,
  UpdateAdminTripPayload,
  TripStatus,
  BulkUpdateTripPricePayload,
  CopyTripsPayload,
  CopyTripSource,
  AdminTripOptionsParams,
} from "@/types/admin/trips/trip-management.type";

export async function findTripsByDateForCopy(payload: CopyTripsPayload) {
  let sql = `
    SELECT
      t.trip_id AS tripId,

      t.schedule_template_id AS scheduleTemplateId,

      t.route_id AS routeId,

      t.vehicle_id AS vehicleId,

      (
        SELECT td.driver_id
        FROM trip_drivers td
        WHERE td.trip_id = t.trip_id
        ORDER BY td.trip_driver_id ASC
        LIMIT 1
      ) AS driverId,

      DATE_FORMAT(
        t.departure_datetime,
        '%Y-%m-%d %H:%i:%s'
      ) AS departureDatetime,

      DATE_FORMAT(
        t.arrival_datetime,
        '%Y-%m-%d %H:%i:%s'
      ) AS arrivalDatetime,

      COALESCE(
        sl.total_seats,
        t.available_seats
      ) AS totalSeats,

      t.ticket_price AS ticketPrice,

      t.status

    FROM trips t

    LEFT JOIN vehicles v
      ON v.vehicle_id = t.vehicle_id

    LEFT JOIN seat_layouts sl
      ON sl.seat_layout_id =
         v.seat_layout_id

    WHERE DATE(t.departure_datetime) = ?

      AND t.status NOT IN (
        'CANCELLED',
        'COMPLETED'
      )
  `;

  const params: any[] = [payload.sourceDate];

  if (payload.routeId) {
    sql += `
      AND t.route_id = ?
    `;

    params.push(payload.routeId);
  }

  sql += `
    ORDER BY
      t.departure_datetime ASC,
      t.trip_id ASC
  `;

  return await query<CopyTripSource>(sql, params);
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

  scheduleTemplateId: number;

  routeId: number;

  vehicleId: number | null;

  departureDatetime: string;

  arrivalDatetime: string;

  availableSeats: number;

  ticketPrice: number | null;
}) {
  await execute(
    `
    UPDATE trips

    SET
      schedule_template_id = ?,

      route_id = ?,

      vehicle_id = ?,

      departure_datetime = ?,

      arrival_datetime = ?,

      available_seats = ?,

      ticket_price = ?,

      status = 'OPEN'

    WHERE trip_id = ?
    `,
    [
      data.scheduleTemplateId,

      data.routeId,

      data.vehicleId,

      data.departureDatetime,

      data.arrivalDatetime,

      data.availableSeats,

      data.ticketPrice,

      data.tripId,
    ],
  );
}
export async function replaceTripDriverRepo(
  tripId: number,
  driverId: number | null,
) {
  await execute(
    `
    DELETE FROM trip_drivers
    WHERE trip_id = ?
    `,
    [tripId],
  );

  if (driverId === null) {
    return;
  }

  await execute(
    `
    INSERT INTO trip_drivers (
      trip_id,
      driver_id
    )

    VALUES (?, ?)
    `,
    [tripId, driverId],
  );
}
export async function createTripDriverRepo(tripId: number, driverId: number) {
  await execute(
    `
    INSERT INTO trip_drivers (
      trip_id,
      driver_id
    )

    VALUES (?, ?)
    `,
    [tripId, driverId],
  );
}
export async function createCopiedTripRepo(data: {
  scheduleTemplateId: number;
  routeId: number;

  vehicleId: number | null;

  departureDatetime: string;
  arrivalDatetime: string;

  availableSeats: number;

  ticketPrice: number | null;
}) {
  const result = await execute(
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
      data.vehicleId,

      data.departureDatetime,
      data.arrivalDatetime,

      data.availableSeats,

      data.ticketPrice,
    ],
  );

  return result;
}

function toDateText(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
function shiftDateText(dateText: string, days: number) {
  const [year, month, day] = dateText.split("-").map(Number);

  const date = new Date(year, month - 1, day);

  date.setDate(date.getDate() + days);

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
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

  const result: any = await execute(sql, params);

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
  const rows = await query<any>(
    `
    SELECT
      t.trip_id AS tripId,

      t.route_id AS routeId,

      t.schedule_template_id
        AS scheduleTemplateId,

      t.vehicle_id AS vehicleId,

      t.departure_datetime
        AS departureDatetime,

      t.arrival_datetime
        AS arrivalDatetime,

      st.departure_time
        AS scheduleDepartureTime,

      st.estimated_duration
        AS estimatedDuration,

      st.base_price
        AS scheduleBasePrice

    FROM trips t

    INNER JOIN schedule_templates st
      ON st.schedule_template_id =
         t.schedule_template_id

    WHERE t.trip_id = ?

    LIMIT 1
    `,
    [tripId],
  );

  return rows[0] ?? null;
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
    /**
     * ============================================================
     * 1. CHECK ROUTE
     * ============================================================
     */

    const routes = await connQuery<{
      routeId: number;
      basePrice: number;
    }>(
      conn,
      `
      SELECT
        route_id AS routeId,
        base_price AS basePrice
      FROM routes
      WHERE route_id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [data.routeId],
    );

    if (routes.length === 0) {
      throw new Error("Tuyến xe không tồn tại");
    }

    const route = routes[0];

    /**
     * ============================================================
     * 2. CHECK SCHEDULE TEMPLATE
     * ============================================================
     */

    const schedules = await connQuery<{
      scheduleTemplateId: number;
      routeId: number;
      departureTime: string;
      estimatedDuration: number;
      basePrice: number;
    }>(
      conn,
      `
      SELECT
        schedule_template_id AS scheduleTemplateId,
        route_id AS routeId,
        departure_time AS departureTime,
        estimated_duration AS estimatedDuration,
        base_price AS basePrice
      FROM schedule_templates
      WHERE schedule_template_id = ?
      LIMIT 1
      FOR UPDATE
      `,
      [data.scheduleTemplateId],
    );

    if (schedules.length === 0) {
      throw new Error("Lịch chạy không tồn tại");
    }

    const schedule = schedules[0];

    /**
     * ============================================================
     * 3. SCHEDULE PHẢI THUỘC ROUTE
     * ============================================================
     */

    if (Number(schedule.routeId) !== Number(data.routeId)) {
      throw new Error("Lịch chạy không thuộc tuyến xe đã chọn");
    }

    /**
     * ============================================================
     * 4. CHECK THỜI GIAN
     * ============================================================
     */

    const departure = new Date(data.departureDatetime);

    const arrival = new Date(data.arrivalDatetime);

    if (Number.isNaN(departure.getTime()) || Number.isNaN(arrival.getTime())) {
      throw new Error("Thời gian khởi hành hoặc thời gian đến không hợp lệ");
    }

    if (arrival <= departure) {
      throw new Error("Thời gian đến phải lớn hơn thời gian khởi hành");
    }

    /**
     * ============================================================
     * 5. KHÔNG CHO TẠO CHUYẾN TRONG QUÁ KHỨ
     * ============================================================
     */

    if (departure <= new Date()) {
      throw new Error(
        "Không thể tạo chuyến có thời gian khởi hành trong quá khứ",
      );
    }

    /**
     * ============================================================
     * 6. CHECK TRÙNG CHUYẾN
     *
     * Cùng route + cùng departure
     * ============================================================
     */

    /**
     * ============================================================
     * 7. CHECK VEHICLE
     * ============================================================
     */

    let totalSeats = 0;

    if (data.vehicleId) {
      const vehicles = await connQuery<{
        vehicleId: number;
        totalSeats: number;
        status: string;
      }>(
        conn,
        `
        SELECT
          v.vehicle_id AS vehicleId,
          sl.total_seats AS totalSeats,
          v.status
        FROM vehicles v
        inner join seat_layouts sl on sl.seat_layout_id = v.seat_layout_id
        WHERE vehicle_id = ?
        LIMIT 1
        FOR UPDATE
        `,
        [data.vehicleId],
      );

      if (vehicles.length === 0) {
        throw new Error("Xe không tồn tại");
      }

      const vehicle = vehicles[0];

      /**
       * Chỗ này dựa theo status hiện tại
       * của bảng vehicles.
       */
      if (vehicle.status !== "AVAILABLE") {
        throw new Error("Xe hiện không ở trạng thái hoạt động");
      }

      totalSeats = Number(vehicle.totalSeats);

      if (totalSeats <= 0) {
        throw new Error("Xe chưa được cấu hình số ghế hợp lệ");
      }

      /**
       * ========================================================
       * 8. XE KHÔNG ĐƯỢC TRÙNG LỊCH
       * ========================================================
       */

      const vehicleConflicts = await connQuery<{
        tripId: number;
        departureDatetime: string;
        arrivalDatetime: string;
      }>(
        conn,
        `
          SELECT
            trip_id AS tripId,
            departure_datetime AS departureDatetime,
            arrival_datetime AS arrivalDatetime
          FROM trips
          WHERE vehicle_id = ?
            AND status <> 'CANCELLED'
            AND departure_datetime < ?
            AND arrival_datetime > ?
          LIMIT 1
          FOR UPDATE
          `,
        [data.vehicleId, data.arrivalDatetime, data.departureDatetime],
      );

      if (vehicleConflicts.length > 0) {
        throw new Error(
          "Xe đã được xếp cho một chuyến khác trong khoảng thời gian này",
        );
      }
    }

    /**
     * ============================================================
     * 9. CHECK DRIVER
     * ============================================================
     */

    if (data.driverId) {
      const drivers = await connQuery<{
        driverId: number;
        status: string;
      }>(
        conn,
        `
        SELECT
          driver_id AS driverId,
          status
        FROM drivers
        WHERE driver_id = ?
        LIMIT 1
        FOR UPDATE
        `,
        [data.driverId],
      );

      if (drivers.length === 0) {
        throw new Error("Tài xế không tồn tại");
      }

      const driver = drivers[0];

      if (driver.status !== "AVAILABLE") {
        throw new Error("Tài xế hiện không ở trạng thái hoạt động");
      }

      /**
       * ========================================================
       * 10. DRIVER KHÔNG ĐƯỢC TRÙNG LỊCH
       * ========================================================
       */

      const driverConflicts = await connQuery<{
        tripId: number;
      }>(
        conn,
        `
          SELECT
            td.trip_id AS tripId
          FROM trip_drivers td
          INNER JOIN trips t
            ON t.trip_id = td.trip_id
          WHERE td.driver_id = ?
            AND t.status <> 'CANCELLED'
            AND t.departure_datetime < ?
            AND t.arrival_datetime > ?
          LIMIT 1
          FOR UPDATE
          `,
        [data.driverId, data.arrivalDatetime, data.departureDatetime],
      );

      if (driverConflicts.length > 0) {
        throw new Error(
          "Tài xế đã được phân công cho một chuyến khác trong khoảng thời gian này",
        );
      }
    }

    /**
     * ============================================================
     * 11. TÍNH GIÁ VÉ
     *
     * Nếu admin không nhập giá:
     * ưu tiên schedule.base_price
     * fallback route.base_price
     * ============================================================
     */

    const ticketPrice =
      data.ticketPrice ?? schedule.basePrice ?? route.basePrice ?? null;

    if (ticketPrice !== null && Number(ticketPrice) < 0) {
      throw new Error("Giá vé không hợp lệ");
    }

    /**
     * ============================================================
     * 12. INSERT TRIP
     * ============================================================
     *
     * Nếu chưa xếp xe:
     * totalSeats = 0
     * availableSeats = 0
     *
     * Khi admin xếp xe sau,
     * update trip sẽ cập nhật lại sức chứa.
     */

    const tripResult = await connExecute(
      conn,
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
        data.vehicleId ?? null,
        data.departureDatetime,
        data.arrivalDatetime,
        totalSeats,
        ticketPrice,
      ],
    );

    const tripId = tripResult.insertId;

    /**
     * ============================================================
     * 13. ASSIGN DRIVER
     * ============================================================
     */

    if (data.driverId) {
      await connExecute(
        conn,
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

    /**
     * ============================================================
     * 14. RETURN
     * ============================================================
     */

    return {
      tripId,
      routeId: data.routeId,
      scheduleTemplateId: data.scheduleTemplateId,

      vehicleId: data.vehicleId ?? null,

      driverId: data.driverId ?? null,

      totalSeats,
      availableSeats: totalSeats,

      ticketPrice,
      status: "OPEN" as const,
    };
  });
}

export async function updateAdminTripRepo(
  tripId: number,
  data: UpdateAdminTripPayload,
) {
  return await withTransaction(async (conn) => {
    /* =====================================================
     * 1. LOCK TRIP
     * =================================================== */

    const [tripRows] = await conn.execute<any[]>(
      `
          SELECT
            t.trip_id,

            t.vehicle_id,

            t.available_seats,

            (
              SELECT COUNT(*)

              FROM booking_seats bs

              INNER JOIN bookings b
                ON b.booking_id =
                   bs.booking_id

              WHERE bs.trip_id =
                    t.trip_id

                AND b.status IN (
                  'PENDING',
                  'CONFIRMED'
                )
            ) AS booking_count

          FROM trips t

          WHERE t.trip_id = ?

          FOR UPDATE
          `,
      [tripId],
    );

    if (!tripRows.length) {
      throw new Error("Không tìm thấy chuyến xe");
    }

    const currentTrip = tripRows[0];

    /* =====================================================
     * 2. BOOKING COUNT
     * =================================================== */

    const bookingCount = Number(currentTrip.booking_count ?? 0);

    /* =====================================================
     * 3. AVAILABLE SEATS
     * =================================================== */

    let availableSeats = Number(currentTrip.available_seats);

    /**
     * Chưa có booking:
     *
     * Xe mới => lấy tổng ghế xe mới.
     */
    if (bookingCount === 0 && data.vehicleId) {
      const [vehicleRows] = await conn.execute<any[]>(
        `
            SELECT
              sl.total_seats
                AS totalSeats

            FROM vehicles v

            INNER JOIN seat_layouts sl
              ON sl.seat_layout_id =
                 v.seat_layout_id

            WHERE v.vehicle_id = ?

            LIMIT 1
            `,
        [data.vehicleId],
      );

      if (!vehicleRows.length) {
        throw new Error("Không tìm thấy xe được chọn");
      }

      availableSeats = Number(vehicleRows[0].totalSeats);
    }

    /* =====================================================
     * 4. UPDATE TRIP
     * =================================================== */

    await conn.execute(
      `
        UPDATE trips

        SET
          schedule_template_id = ?,

          vehicle_id = ?,

          departure_datetime = ?,

          arrival_datetime = ?,

          ticket_price = ?,

          status = ?,

          available_seats = ?

        WHERE trip_id = ?
        `,
      [
        data.scheduleTemplateId,

        data.vehicleId ?? null,

        data.departureDatetime,

        data.arrivalDatetime,

        data.ticketPrice ?? null,

        data.status,

        availableSeats,

        tripId,
      ],
    );

    /* =====================================================
     * 5. XÓA MAIN DRIVER CŨ
     * =================================================== */

    await conn.execute(
      `
        DELETE FROM trip_drivers

        WHERE trip_id = ?

          AND assigned_role = 'MAIN'
        `,
      [tripId],
    );

    /* =====================================================
     * 6. GÁN MAIN DRIVER MỚI
     * =================================================== */

    if (data.driverId) {
      await conn.execute(
        `
          INSERT INTO trip_drivers (
            trip_id,
            driver_id,
            assigned_role
          )

          VALUES (
            ?,
            ?,
            'MAIN'
          )
          `,
        [tripId, data.driverId],
      );
    }

    /* =====================================================
     * 7. RESULT
     * =================================================== */

    return {
      tripId,

      scheduleTemplateId: data.scheduleTemplateId,

      departureDatetime: data.departureDatetime,

      arrivalDatetime: data.arrivalDatetime,

      availableSeats,
    };
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

export async function findAdminTripOptions(params: AdminTripOptionsParams) {
  const { routeId } = params;

  /**
   * ============================================================
   * ROUTES
   * ============================================================
   */
  const routes = await query<any>(`
    SELECT
      MIN(r.route_id) AS routeId,
      r.origin_city_id AS originCityId,
      r.destination_city_id AS destinationCityId,

      CONCAT(
        oc.city_name,
        ' → ',
        dc.city_name
      ) AS routeName,

      MIN(r.base_price) AS basePrice,
      MIN(r.estimated_duration) AS estimatedDuration

    FROM routes r

    INNER JOIN cities oc
      ON oc.city_id = r.origin_city_id

    INNER JOIN cities dc
      ON dc.city_id = r.destination_city_id

    WHERE r.status = 'ACTIVE'

    GROUP BY
      r.origin_city_id,
      r.destination_city_id,
      oc.city_name,
      dc.city_name

    ORDER BY
      oc.city_name,
      dc.city_name
  `);

  /**
   * ============================================================
   * VEHICLES
   * ============================================================
   */
  const vehicles = await query<any>(`
    SELECT
      v.vehicle_id AS vehicleId,
      v.vehicle_name AS vehicleName,
      v.license_plate AS licensePlate,
      vt.type_name AS vehicleTypeName,
      sl.total_seats AS totalSeats,
      v.status AS status

    FROM vehicles v

    INNER JOIN vehicle_types vt
      ON vt.vehicle_type_id = v.vehicle_type_id

    INNER JOIN seat_layouts sl
      ON sl.seat_layout_id = v.seat_layout_id

    WHERE v.status = 'AVAILABLE'

    ORDER BY
      v.license_plate ASC
  `);

  /**
   * ============================================================
   * DRIVERS
   * ============================================================
   */
  const drivers = await query<any>(`
    SELECT
      d.driver_id AS driverId,
      u.full_name AS fullName,
      d.license_number AS licenseNumber,
      d.status AS status

    FROM drivers d
    inner join users u on u.user_id=d.user_id
    WHERE d.status = 'AVAILABLE'

    ORDER BY
      u.full_name ASC
  `);
  /**
   * ============================================================
   * SCHEDULE TEMPLATES
   * ============================================================
   */
  const scheduleTemplates = await query<any>(
    `
    SELECT
      st.schedule_template_id AS scheduleTemplateId,

      st.route_id AS routeId,

      r.origin_city_id AS originCityId,
      r.destination_city_id AS destinationCityId,

      CONCAT(
        TIME_FORMAT(st.departure_time, '%H:%i'),
        ' • ',
        FORMAT(st.base_price, 0),
        'đ'
      ) AS scheduleName,

      TIME_FORMAT(
        st.departure_time,
        '%H:%i'
      ) AS departureTime,

      st.estimated_duration AS estimatedDuration,

      st.base_price AS basePrice

    FROM schedule_templates st

    INNER JOIN routes r
      ON r.route_id = st.route_id

    WHERE st.is_active = TRUE

    ${routeId ? "AND st.route_id = ?" : ""}

    ORDER BY
      st.departure_time ASC
    `,
    routeId ? [routeId] : [],
  );

  return {
    routes,
    vehicles,
    drivers,
    scheduleTemplates,
  };
}
export async function getVehicleTotalSeatsForCopy(
  vehicleId: number | null,
): Promise<number> {
  if (vehicleId === null) {
    return 0;
  }

  const rows = await query<any>(
    `
    SELECT
      sl.total_seats AS totalSeats

    FROM vehicles v

    INNER JOIN seat_layouts sl
      ON sl.seat_layout_id = v.seat_layout_id

    WHERE v.vehicle_id = ?

    LIMIT 1
    `,
    [vehicleId],
  );

  if (!rows.length) {
    throw new Error("Không tìm thấy sơ đồ ghế của xe");
  }

  return Number(rows[0].totalSeats);
}
export async function findAvailableTripResources(data: {
  routeId: number;
  scheduleTemplateId: number;
  departureDatetime: string;
  arrivalDatetime: string;
  tripId?: number;
}) {
  /*
   * ============================================================
   * 0. LẤY ROUTE HIỆN TẠI
   * ============================================================
   */

  const routeRows = await query<any>(
    `
    SELECT
      route_id AS routeId,
      origin_city_id AS originCityId,
      destination_city_id AS destinationCityId
    FROM routes
    WHERE route_id = ?
    LIMIT 1
    `,
    [data.routeId],
  );

  if (!routeRows.length) {
    throw new Error("Không tìm thấy tuyến xe");
  }

  const currentRoute = routeRows[0];

  /*
   * ============================================================
   * 1. TÌM XE KHẢ DỤNG
   *
   * Quy tắc:
   *
   * 1. Xe phải AVAILABLE
   * 2. Không được overlap chuyến khác
   * 3. Nếu có chuyến trước:
   *      previous.destination
   *          =
   *      current.origin
   *
   *      previous.arrival + 15 phút
   *          <=
   *      current.departure
   *
   * 4. Nếu có chuyến sau:
   *      current.destination
   *          =
   *      next.origin
   *
   *      current.arrival + 15 phút
   *          <=
   *      next.departure
   * ============================================================
   */

  const vehicles = await query<any>(
    `
    SELECT
      v.vehicle_id AS vehicleId,
      v.vehicle_name AS vehicleName,
      v.license_plate AS licensePlate,

      vt.type_name AS vehicleTypeName,

      sl.total_seats AS totalSeats,

      v.status

    FROM vehicles v

    INNER JOIN vehicle_types vt
      ON vt.vehicle_type_id = v.vehicle_type_id

    INNER JOIN seat_layouts sl
      ON sl.seat_layout_id = v.seat_layout_id

    WHERE v.status = 'AVAILABLE'

    /*
     * ========================================================
     * 1.1 KHÔNG ĐƯỢC OVERLAP
     * ========================================================
     */

    AND NOT EXISTS (
      SELECT 1

      FROM trips t

      WHERE t.vehicle_id = v.vehicle_id

        AND t.status NOT IN (
          'CANCELLED',
          'COMPLETED'
        )

        AND (
          ? IS NULL
          OR t.trip_id <> ?
        )

        AND t.departure_datetime < ?
        AND t.arrival_datetime > ?
    )

    /*
     * ========================================================
     * 1.2 CHUYẾN TRƯỚC
     *
     * Lấy chuyến có departure gần nhất trước current.
     *
     * Nếu không có previous:
     *      PASS
     *
     * Nếu có previous:
     *      previous.destination = current.origin
     *      previous.arrival + 15m <= current.departure
     * ========================================================
     */

    AND (
      NOT EXISTS (
        SELECT 1

        FROM trips previous

        WHERE previous.vehicle_id = v.vehicle_id

          AND previous.status NOT IN (
            'CANCELLED',
            'COMPLETED'
          )

          AND (
            ? IS NULL
            OR previous.trip_id <> ?
          )

          AND previous.departure_datetime < ?
      )

      OR EXISTS (
        SELECT 1

        FROM trips previous

        INNER JOIN routes previous_route
          ON previous_route.route_id = previous.route_id

        WHERE previous.vehicle_id = v.vehicle_id

          AND previous.status NOT IN (
            'CANCELLED',
            'COMPLETED'
          )

          AND (
            ? IS NULL
            OR previous.trip_id <> ?
          )

          AND previous.departure_datetime < ?

          /*
           * Đây phải là chuyến gần nhất trước current.
           */
          AND NOT EXISTS (
            SELECT 1

            FROM trips closer_previous

            WHERE closer_previous.vehicle_id = v.vehicle_id

              AND closer_previous.status NOT IN (
                'CANCELLED',
                'COMPLETED'
              )

              AND (
                ? IS NULL
                OR closer_previous.trip_id <> ?
              )

              AND closer_previous.departure_datetime < ?

              AND closer_previous.departure_datetime
                  > previous.departure_datetime
          )

          /*
           * Điểm đến chuyến trước
           * phải là điểm xuất phát chuyến hiện tại.
           */
          AND previous_route.destination_city_id =
              ?

          /*
           * Xe cần 15 phút quay đầu.
           */
          AND DATE_ADD(
            previous.arrival_datetime,
            INTERVAL 15 MINUTE
          ) <= ?
      )
    )

    /*
     * ========================================================
     * 1.3 CHUYẾN SAU
     *
     * Lấy chuyến có departure gần nhất sau current.
     *
     * Nếu không có next:
     *      PASS
     *
     * Nếu có next:
     *      current.destination = next.origin
     *      current.arrival + 15m <= next.departure
     * ========================================================
     */

    AND (
      NOT EXISTS (
        SELECT 1

        FROM trips next_trip

        WHERE next_trip.vehicle_id = v.vehicle_id

          AND next_trip.status NOT IN (
            'CANCELLED',
            'COMPLETED'
          )

          AND (
            ? IS NULL
            OR next_trip.trip_id <> ?
          )

          AND next_trip.departure_datetime >= ?
      )

      OR EXISTS (
        SELECT 1

        FROM trips next_trip

        INNER JOIN routes next_route
          ON next_route.route_id = next_trip.route_id

        WHERE next_trip.vehicle_id = v.vehicle_id

          AND next_trip.status NOT IN (
            'CANCELLED',
            'COMPLETED'
          )

          AND (
            ? IS NULL
            OR next_trip.trip_id <> ?
          )

          AND next_trip.departure_datetime >= ?

          /*
           * Đây phải là chuyến gần nhất sau current.
           */
          AND NOT EXISTS (
            SELECT 1

            FROM trips closer_next

            WHERE closer_next.vehicle_id = v.vehicle_id

              AND closer_next.status NOT IN (
                'CANCELLED',
                'COMPLETED'
              )

              AND (
                ? IS NULL
                OR closer_next.trip_id <> ?
              )

              AND closer_next.departure_datetime >= ?

              AND closer_next.departure_datetime
                  < next_trip.departure_datetime
          )

          /*
           * Điểm xuất phát chuyến sau
           * phải là điểm đến chuyến hiện tại.
           */
          AND next_route.origin_city_id =
              ?

          /*
           * Xe cần 15 phút quay đầu.
           */
          AND DATE_ADD(
            ?,
            INTERVAL 15 MINUTE
          ) <= next_trip.departure_datetime
      )
    )

    ORDER BY v.license_plate ASC
    `,
    [
      /*
       * OVERLAP
       */
      data.tripId ?? null,
      data.tripId ?? null,
      data.arrivalDatetime,
      data.departureDatetime,

      /*
       * PREVIOUS - NOT EXISTS
       */
      data.tripId ?? null,
      data.tripId ?? null,
      data.departureDatetime,

      /*
       * PREVIOUS - EXISTS
       */
      data.tripId ?? null,
      data.tripId ?? null,
      data.departureDatetime,

      /*
       * PREVIOUS - closer previous
       */
      data.tripId ?? null,
      data.tripId ?? null,
      data.departureDatetime,

      /*
       * previous.destination = current.origin
       */
      currentRoute.originCityId,

      /*
       * previous.arrival + 15m
       */
      data.departureDatetime,

      /*
       * NEXT - NOT EXISTS
       */
      data.tripId ?? null,
      data.tripId ?? null,
      data.arrivalDatetime,

      /*
       * NEXT - EXISTS
       */
      data.tripId ?? null,
      data.tripId ?? null,
      data.arrivalDatetime,

      /*
       * NEXT - closer next
       */
      data.tripId ?? null,
      data.tripId ?? null,
      data.arrivalDatetime,

      /*
       * next.origin = current.destination
       */
      currentRoute.destinationCityId,

      /*
       * current.arrival + 15m
       */
      data.arrivalDatetime,
    ],
  );

  /*
   * ============================================================
   * 2. TÌM TÀI XẾ KHẢ DỤNG
   *
   * Logic giống XE nhưng:
   *
   * - Previous nghỉ 1 giờ
   * - Next nghỉ 1 giờ
   * ============================================================
   */

  const drivers = await query<any>(
    `
    SELECT
      d.driver_id AS driverId,

      u.full_name AS fullName,

      d.license_number AS licenseNumber,

      d.status

    FROM drivers d

    INNER JOIN users u
      ON u.user_id = d.user_id

    WHERE d.status = 'AVAILABLE'

    /*
     * ========================================================
     * 2.1 KHÔNG OVERLAP
     * ========================================================
     */

    AND NOT EXISTS (
      SELECT 1

      FROM trip_drivers td

      INNER JOIN trips t
        ON t.trip_id = td.trip_id

      WHERE td.driver_id = d.driver_id

        AND t.status NOT IN (
          'CANCELLED',
          'COMPLETED'
        )

        AND (
          ? IS NULL
          OR t.trip_id <> ?
        )

        AND t.departure_datetime < ?
        AND t.arrival_datetime > ?
    )

    /*
     * ========================================================
     * 2.2 CHUYẾN TRƯỚC
     * ========================================================
     */

    AND (
      NOT EXISTS (
        SELECT 1

        FROM trip_drivers td_previous

        INNER JOIN trips previous
          ON previous.trip_id = td_previous.trip_id

        WHERE td_previous.driver_id = d.driver_id

          AND previous.status NOT IN (
            'CANCELLED',
            'COMPLETED'
          )

          AND (
            ? IS NULL
            OR previous.trip_id <> ?
          )

          AND previous.departure_datetime < ?
      )

      OR EXISTS (
        SELECT 1

        FROM trip_drivers td_previous

        INNER JOIN trips previous
          ON previous.trip_id = td_previous.trip_id

        INNER JOIN routes previous_route
          ON previous_route.route_id = previous.route_id

        WHERE td_previous.driver_id = d.driver_id

          AND previous.status NOT IN (
            'CANCELLED',
            'COMPLETED'
          )

          AND (
            ? IS NULL
            OR previous.trip_id <> ?
          )

          AND previous.departure_datetime < ?

          /*
           * Chuyến trước gần nhất.
           */
          AND NOT EXISTS (
            SELECT 1

            FROM trip_drivers td_closer

            INNER JOIN trips closer_previous
              ON closer_previous.trip_id = td_closer.trip_id

            WHERE td_closer.driver_id = d.driver_id

              AND closer_previous.status NOT IN (
                'CANCELLED',
                'COMPLETED'
              )

              AND (
                ? IS NULL
                OR closer_previous.trip_id <> ?
              )

              AND closer_previous.departure_datetime < ?

              AND closer_previous.departure_datetime
                  > previous.departure_datetime
          )

          /*
           * Previous destination = Current origin
           */
          AND previous_route.destination_city_id =
              ?

          /*
           * Driver nghỉ 1 giờ.
           */
          AND DATE_ADD(
            previous.arrival_datetime,
            INTERVAL 1 HOUR
          ) <= ?
      )
    )

    /*
     * ========================================================
     * 2.3 CHUYẾN SAU
     * ========================================================
     */

    AND (
      NOT EXISTS (
        SELECT 1

        FROM trip_drivers td_next

        INNER JOIN trips next_trip
          ON next_trip.trip_id = td_next.trip_id

        WHERE td_next.driver_id = d.driver_id

          AND next_trip.status NOT IN (
            'CANCELLED',
            'COMPLETED'
          )

          AND (
            ? IS NULL
            OR next_trip.trip_id <> ?
          )

          AND next_trip.departure_datetime >= ?
      )

      OR EXISTS (
        SELECT 1

        FROM trip_drivers td_next

        INNER JOIN trips next_trip
          ON next_trip.trip_id = td_next.trip_id

        INNER JOIN routes next_route
          ON next_route.route_id = next_trip.route_id

        WHERE td_next.driver_id = d.driver_id

          AND next_trip.status NOT IN (
            'CANCELLED',
            'COMPLETED'
          )

          AND (
            ? IS NULL
            OR next_trip.trip_id <> ?
          )

          AND next_trip.departure_datetime >= ?

          /*
           * Chuyến sau gần nhất.
           */
          AND NOT EXISTS (
            SELECT 1

            FROM trip_drivers td_closer

            INNER JOIN trips closer_next
              ON closer_next.trip_id = td_closer.trip_id

            WHERE td_closer.driver_id = d.driver_id

              AND closer_next.status NOT IN (
                'CANCELLED',
                'COMPLETED'
              )

              AND (
                ? IS NULL
                OR closer_next.trip_id <> ?
              )

              AND closer_next.departure_datetime >= ?

              AND closer_next.departure_datetime
                  < next_trip.departure_datetime
          )

          /*
           * Current destination = Next origin
           */
          AND next_route.origin_city_id =
              ?

          /*
           * Driver nghỉ 1 giờ.
           */
          AND DATE_ADD(
            ?,
            INTERVAL 1 HOUR
          ) <= next_trip.departure_datetime
      )
    )

    ORDER BY u.full_name ASC
    `,
    [
      /*
       * OVERLAP
       */
      data.tripId ?? null,
      data.tripId ?? null,
      data.arrivalDatetime,
      data.departureDatetime,

      /*
       * PREVIOUS - NOT EXISTS
       */
      data.tripId ?? null,
      data.tripId ?? null,
      data.departureDatetime,

      /*
       * PREVIOUS - EXISTS
       */
      data.tripId ?? null,
      data.tripId ?? null,
      data.departureDatetime,

      /*
       * PREVIOUS - closer
       */
      data.tripId ?? null,
      data.tripId ?? null,
      data.departureDatetime,

      /*
       * previous.destination = current.origin
       */
      currentRoute.originCityId,

      /*
       * previous.arrival + 1 hour
       */
      data.departureDatetime,

      /*
       * NEXT - NOT EXISTS
       */
      data.tripId ?? null,
      data.tripId ?? null,
      data.arrivalDatetime,

      /*
       * NEXT - EXISTS
       */
      data.tripId ?? null,
      data.tripId ?? null,
      data.arrivalDatetime,

      /*
       * NEXT - closer
       */
      data.tripId ?? null,
      data.tripId ?? null,
      data.arrivalDatetime,

      /*
       * next.origin = current.destination
       */
      currentRoute.destinationCityId,

      /*
       * current.arrival + 1 hour
       */
      data.arrivalDatetime,
    ],
  );

  return {
    vehicles: vehicles ?? [],
    drivers: drivers ?? [],
  };
}
export async function findScheduleTemplateForTrip(
  scheduleTemplateId: number,
  routeId: number,
) {
  const rows = await query<any>(
    `
    SELECT
      st.schedule_template_id AS scheduleTemplateId,
      st.route_id AS routeId,
      st.departure_time AS departureTime,
      st.estimated_duration AS estimatedDuration,
      st.base_price AS basePrice
    FROM schedule_templates st

    WHERE st.schedule_template_id = ?
      AND st.route_id = ?
      AND st.is_active = TRUE

    LIMIT 1
    `,
    [scheduleTemplateId, routeId],
  );

  return rows[0] ?? null;
}
export async function findRouteForTrip(routeId: number) {
  const rows = await query<any>(
    `
    SELECT
      route_id AS routeId,
      origin_city_id AS originCityId,
      destination_city_id AS destinationCityId
    FROM routes
    WHERE route_id = ?
    LIMIT 1
    `,
    [routeId],
  );

  return rows[0] ?? null;
}
export async function findScheduleTemplateForRoute(data: {
  scheduleTemplateId: number;
  routeId: number;
}) {
  const rows = await query<any>(
    `
    SELECT
      schedule_template_id AS scheduleTemplateId,

      departure_time AS departureTime,

      estimated_duration AS estimatedDuration,

      base_price AS basePrice

    FROM schedule_templates

    WHERE schedule_template_id = ?
      AND route_id = ?

    LIMIT 1
    `,
    [data.scheduleTemplateId, data.routeId],
  );

  return rows[0] ?? null;
}
export async function checkDuplicatedTrip(
  routeId: number,
  departureDatetime: string,
  arrivalDatetime: string,
  tripId?: number,
) {
  const rows = await query<any>(
    `
    SELECT
      t.trip_id AS tripId,
      t.route_id AS routeId,
      t.departure_datetime AS departureDatetime,
      t.arrival_datetime AS arrivalDatetime,
      t.status
    FROM trips t
    WHERE t.route_id = ?

      AND t.status NOT IN (
        'CANCELLED',
        'COMPLETED'
      )

      AND (? IS NULL OR t.trip_id <> ?)

      AND t.departure_datetime < ?
      AND t.arrival_datetime > ?

    ORDER BY t.departure_datetime ASC

    LIMIT 1
    `,
    [
      routeId,

      tripId ?? null,
      tripId ?? null,

      arrivalDatetime,
      departureDatetime,
    ],
  );

  return rows[0] ?? null;
}
export async function checkVehicleAvailable(
  vehicleId: number,
  routeId: number,
  departureDatetime: string,
  arrivalDatetime: string,
  tripId?: number,
) {
  /*
   * ============================================================
   * 1. XE PHẢI TỒN TẠI + AVAILABLE
   * ============================================================
   */

  const vehicles = await query<any>(
    `
    SELECT
      vehicle_id AS vehicleId
    FROM vehicles
    WHERE vehicle_id = ?
      AND status = 'AVAILABLE'
    LIMIT 1
    `,
    [vehicleId],
  );

  if (!vehicles.length) {
    return {
      available: false,
      reason: "Xe không tồn tại hoặc không ở trạng thái AVAILABLE",
    };
  }

  /*
   * ============================================================
   * 2. LẤY ROUTE HIỆN TẠI
   * ============================================================
   */

  const currentRoute = await findRouteForTrip(routeId);

  if (!currentRoute) {
    return {
      available: false,
      reason: "Không tìm thấy tuyến hiện tại",
    };
  }

  const currentOriginCityId = Number(currentRoute.originCityId);
  const currentDestinationCityId = Number(currentRoute.destinationCityId);

  /*
   * ============================================================
   * 3. CHECK OVERLAP VỚI CHUYẾN KHÁC
   * ============================================================
   *
   * existing.start < current.end
   * AND
   * existing.end > current.start
   *
   * Nếu đúng => overlap.
   * ============================================================
   */

  const conflictTrips = await query<any>(
    `
    SELECT
      t.trip_id AS tripId,
      t.departure_datetime AS departureDatetime,
      t.arrival_datetime AS arrivalDatetime
    FROM trips t
    WHERE t.vehicle_id = ?

      AND t.status NOT IN (
        'CANCELLED',
        'COMPLETED'
      )

      AND (? IS NULL OR t.trip_id <> ?)

      AND t.departure_datetime < ?
      AND t.arrival_datetime > ?

    ORDER BY t.departure_datetime ASC

    LIMIT 1
    `,
    [
      vehicleId,

      tripId ?? null,
      tripId ?? null,

      arrivalDatetime,
      departureDatetime,
    ],
  );

  if (conflictTrips.length > 0) {
    const conflict = conflictTrips[0];

    return {
      available: false,
      reason:
        `Xe đang được sử dụng bởi chuyến ` +
        `${conflict.departureDatetime} - ${conflict.arrivalDatetime}`,
    };
  }

  /*
   * ============================================================
   * 4. KIỂM TRA CHUYẾN TRƯỚC
   * ============================================================
   */

  const previousTrips = await query<any>(
    `
    SELECT
      t.trip_id AS tripId,
      t.departure_datetime AS departureDatetime,
      t.arrival_datetime AS arrivalDatetime,
      r.origin_city_id AS originCityId,
      r.destination_city_id AS destinationCityId

    FROM trips t

    INNER JOIN routes r
      ON r.route_id = t.route_id

    WHERE t.vehicle_id = ?

      AND t.status NOT IN (
        'CANCELLED',
        'COMPLETED'
      )

      AND (? IS NULL OR t.trip_id <> ?)

      AND t.departure_datetime < ?

    ORDER BY t.departure_datetime DESC

    LIMIT 1
    `,
    [vehicleId, tripId ?? null, tripId ?? null, departureDatetime],
  );

  if (previousTrips.length > 0) {
    const previous = previousTrips[0];

    /*
     * ----------------------------------------------------------
     * 4.1. KIỂM TRA VỊ TRÍ XE
     *
     * Previous:
     * A -> B
     *
     * Current:
     * B -> C
     *
     * => OK
     *
     * Previous:
     * A -> B
     *
     * Current:
     * C -> D
     *
     * => FAIL
     * ----------------------------------------------------------
     */

    if (Number(previous.destinationCityId) !== currentOriginCityId) {
      return {
        available: false,
        reason:
          "Xe chưa ở đúng điểm xuất phát của chuyến hiện tại. " +
          "Chuyến trước phải kết thúc tại điểm xuất phát của chuyến mới.",
      };
    }

    /*
     * ----------------------------------------------------------
     * 4.2. XE CẦN 15 PHÚT QUAY ĐẦU
     * ----------------------------------------------------------
     */

    const turnaround = await query<any>(
      `
      SELECT
        CASE
          WHEN DATE_ADD(?, INTERVAL 15 MINUTE) <= ?
          THEN 1
          ELSE 0
        END AS valid
      `,
      [previous.arrivalDatetime, departureDatetime],
    );

    if (Number(turnaround[0]?.valid) !== 1) {
      return {
        available: false,
        reason: "Xe chưa đủ 15 phút thời gian quay đầu sau chuyến trước.",
      };
    }
  }

  /*
   * ============================================================
   * 5. KIỂM TRA CHUYẾN SAU
   * ============================================================
   */

  const nextTrips = await query<any>(
    `
    SELECT
      t.trip_id AS tripId,
      t.departure_datetime AS departureDatetime,
      t.arrival_datetime AS arrivalDatetime,

      r.origin_city_id AS originCityId,
      r.destination_city_id AS destinationCityId

    FROM trips t

    INNER JOIN routes r
      ON r.route_id = t.route_id

    WHERE t.vehicle_id = ?

      AND t.status NOT IN (
        'CANCELLED',
        'COMPLETED'
      )

      AND (? IS NULL OR t.trip_id <> ?)

      AND t.departure_datetime >= ?

    ORDER BY t.departure_datetime ASC

    LIMIT 1
    `,
    [vehicleId, tripId ?? null, tripId ?? null, arrivalDatetime],
  );

  if (nextTrips.length > 0) {
    const next = nextTrips[0];

    /*
     * ----------------------------------------------------------
     * 5.1. XE PHẢI CÓ THỂ ĐI TỪ CURRENT DESTINATION
     * ĐẾN NEXT ORIGIN
     *
     * Current:
     * A -> B
     *
     * Next:
     * B -> C
     *
     * => OK
     *
     * Current:
     * A -> B
     *
     * Next:
     * X -> C
     *
     * => FAIL
     * ----------------------------------------------------------
     */

    if (Number(next.originCityId) !== currentDestinationCityId) {
      return {
        available: false,
        reason:
          "Xe không thể thực hiện chuyến tiếp theo vì điểm đến của chuyến hiện tại " +
          "không trùng điểm xuất phát của chuyến sau.",
      };
    }

    /*
     * ----------------------------------------------------------
     * 5.2. XE CẦN 15 PHÚT TRƯỚC CHUYẾN SAU
     * ----------------------------------------------------------
     */

    const nextTurnaround = await query<any>(
      `
      SELECT
        CASE
          WHEN DATE_ADD(?, INTERVAL 15 MINUTE) <= ?
          THEN 1
          ELSE 0
        END AS valid
      `,
      [arrivalDatetime, next.departureDatetime],
    );

    if (Number(nextTurnaround[0]?.valid) !== 1) {
      return {
        available: false,
        reason:
          "Xe không đủ 15 phút thời gian quay đầu trước chuyến tiếp theo.",
      };
    }
  }

  /*
   * ============================================================
   * 6. XE HỢP LỆ
   * ============================================================
   */

  return {
    available: true,
    reason: null,
  };
}
export async function checkDriverAvailable(
  driverId: number,
  routeId: number,
  departureDatetime: string,
  arrivalDatetime: string,
  tripId?: number,
) {
  /*
   * ============================================================
   * 1. DRIVER PHẢI TỒN TẠI + AVAILABLE
   * ============================================================
   */

  const drivers = await query<any>(
    `
    SELECT
      driver_id AS driverId
    FROM drivers
    WHERE driver_id = ?
      AND status = 'AVAILABLE'
    LIMIT 1
    `,
    [driverId],
  );

  if (!drivers.length) {
    return {
      available: false,
      reason: "Tài xế không tồn tại hoặc không ở trạng thái AVAILABLE",
    };
  }

  /*
   * ============================================================
   * 2. LẤY ROUTE HIỆN TẠI
   * ============================================================
   */

  const currentRoute = await findRouteForTrip(routeId);

  if (!currentRoute) {
    return {
      available: false,
      reason: "Không tìm thấy tuyến hiện tại",
    };
  }

  const currentOriginCityId = Number(currentRoute.originCityId);

  const currentDestinationCityId = Number(currentRoute.destinationCityId);

  /*
   * ============================================================
   * 3. CHECK OVERLAP
   * ============================================================
   */

  const conflictTrips = await query<any>(
    `
    SELECT
      t.trip_id AS tripId,
      t.departure_datetime AS departureDatetime,
      t.arrival_datetime AS arrivalDatetime

    FROM trip_drivers td

    INNER JOIN trips t
      ON t.trip_id = td.trip_id

    WHERE td.driver_id = ?

      AND t.status NOT IN (
        'CANCELLED',
        'COMPLETED'
      )

      AND (? IS NULL OR t.trip_id <> ?)

      AND t.departure_datetime < ?
      AND t.arrival_datetime > ?

    ORDER BY t.departure_datetime ASC

    LIMIT 1
    `,
    [
      driverId,

      tripId ?? null,
      tripId ?? null,

      arrivalDatetime,
      departureDatetime,
    ],
  );

  if (conflictTrips.length > 0) {
    const conflict = conflictTrips[0];

    return {
      available: false,
      reason:
        `Tài xế đang được phân công cho chuyến ` +
        `${conflict.departureDatetime} - ${conflict.arrivalDatetime}`,
    };
  }

  /*
   * ============================================================
   * 4. CHUYẾN TRƯỚC
   * ============================================================
   */

  const previousTrips = await query<any>(
    `
    SELECT
      t.trip_id AS tripId,
      t.departure_datetime AS departureDatetime,
      t.arrival_datetime AS arrivalDatetime,

      r.origin_city_id AS originCityId,
      r.destination_city_id AS destinationCityId

    FROM trip_drivers td

    INNER JOIN trips t
      ON t.trip_id = td.trip_id

    INNER JOIN routes r
      ON r.route_id = t.route_id

    WHERE td.driver_id = ?

      AND t.status NOT IN (
        'CANCELLED',
        'COMPLETED'
      )

      AND (? IS NULL OR t.trip_id <> ?)

      AND t.departure_datetime < ?

    ORDER BY t.departure_datetime DESC

    LIMIT 1
    `,
    [driverId, tripId ?? null, tripId ?? null, departureDatetime],
  );

  if (previousTrips.length > 0) {
    const previous = previousTrips[0];

    /*
     * ----------------------------------------------------------
     * 4.1. KIỂM TRA VỊ TRÍ
     * ----------------------------------------------------------
     */

    if (Number(previous.destinationCityId) !== currentOriginCityId) {
      return {
        available: false,
        reason:
          "Tài xế chưa ở đúng điểm xuất phát của chuyến hiện tại. " +
          "Chuyến trước phải kết thúc tại điểm xuất phát của chuyến mới.",
      };
    }

    /*
     * ----------------------------------------------------------
     * 4.2. TÀI XẾ CẦN 1 GIỜ NGHỈ
     * ----------------------------------------------------------
     */

    const turnaround = await query<any>(
      `
      SELECT
        CASE
          WHEN DATE_ADD(?, INTERVAL 1 HOUR) <= ?
          THEN 1
          ELSE 0
        END AS valid
      `,
      [previous.arrivalDatetime, departureDatetime],
    );

    if (Number(turnaround[0]?.valid) !== 1) {
      return {
        available: false,
        reason: "Tài xế chưa đủ 1 giờ nghỉ sau chuyến trước.",
      };
    }
  }

  /*
   * ============================================================
   * 5. CHUYẾN SAU
   * ============================================================
   */

  const nextTrips = await query<any>(
    `
    SELECT
      t.trip_id AS tripId,
      t.departure_datetime AS departureDatetime,
      t.arrival_datetime AS arrivalDatetime,

      r.origin_city_id AS originCityId,
      r.destination_city_id AS destinationCityId

    FROM trip_drivers td

    INNER JOIN trips t
      ON t.trip_id = td.trip_id

    INNER JOIN routes r
      ON r.route_id = t.route_id

    WHERE td.driver_id = ?

      AND t.status NOT IN (
        'CANCELLED',
        'COMPLETED'
      )

      AND (? IS NULL OR t.trip_id <> ?)

      AND t.departure_datetime >= ?

    ORDER BY t.departure_datetime ASC

    LIMIT 1
    `,
    [driverId, tripId ?? null, tripId ?? null, arrivalDatetime],
  );

  if (nextTrips.length > 0) {
    const next = nextTrips[0];

    /*
     * ----------------------------------------------------------
     * 5.1. VỊ TRÍ
     *
     * Current:
     * A -> B
     *
     * Next:
     * B -> C
     *
     * ----------------------------------------------------------
     */

    if (Number(next.originCityId) !== currentDestinationCityId) {
      return {
        available: false,
        reason:
          "Tài xế không thể thực hiện chuyến tiếp theo vì " +
          "điểm đến của chuyến hiện tại không trùng điểm xuất phát của chuyến sau.",
      };
    }

    /*
     * ----------------------------------------------------------
     * 5.2. TÀI XẾ CẦN 1 GIỜ NGHỈ
     * ----------------------------------------------------------
     */

    const nextTurnaround = await query<any>(
      `
      SELECT
        CASE
          WHEN DATE_ADD(?, INTERVAL 1 HOUR) <= ?
          THEN 1
          ELSE 0
        END AS valid
      `,
      [arrivalDatetime, next.departureDatetime],
    );

    if (Number(nextTurnaround[0]?.valid) !== 1) {
      return {
        available: false,
        reason: "Tài xế không đủ 1 giờ nghỉ trước chuyến tiếp theo.",
      };
    }
  }

  /*
   * ============================================================
   * 6. DRIVER HỢP LỆ
   * ============================================================
   */

  return {
    available: true,
    reason: null,
  };
}
export async function findExistingTripForCopy(payload: {
  routeId: number;
  departureDatetime: string;
}) {
  const rows = await query<any>(
    `
    SELECT
      t.trip_id AS tripId,
      t.schedule_template_id AS scheduleTemplateId,
      t.route_id AS routeId,
      t.vehicle_id AS vehicleId,
      t.departure_datetime AS departureDatetime,
      t.arrival_datetime AS arrivalDatetime,
      t.available_seats AS availableSeats,
      t.ticket_price AS ticketPrice,

      (
        SELECT COUNT(*)
        FROM booking_seats bs
        INNER JOIN bookings b
          ON b.booking_id = bs.booking_id
        WHERE bs.trip_id = t.trip_id
          AND b.status IN (
            'PENDING',
            'CONFIRMED'
          )
      ) AS bookingCount

    FROM trips t

    WHERE t.route_id = ?
      AND t.departure_datetime = ?

      AND t.status NOT IN (
        'CANCELLED',
        'COMPLETED'
      )

    LIMIT 1
    `,
    [payload.routeId, payload.departureDatetime],
  );

  return rows[0] ?? null;
}
