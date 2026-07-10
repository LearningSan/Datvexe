import { query, connQuery } from "@/lib/server/mysql";
import mysql from "mysql2/promise";
import { ResultSetHeader, RowDataPacket } from "mysql2";

export async function insertBookingShuttleBulk(data: any) {
  const bookingId = data.bookingId;

  // 1. delete old requests
  await query(`DELETE FROM booking_shuttle_requests WHERE booking_id = ?`, [
    bookingId,
  ]);

  const values = [];

  // 2. PICKUP
  values.push([
    bookingId,
    data.pickup.type,
    data.pickup.address ?? null,
    data.pickup.latitude ?? null,
    data.pickup.longitude ?? null,
    null,
    null,
  ]);

  // 3. DROPOFF
  values.push([
    bookingId,
    data.dropoff.type,
    data.dropoff.address ?? null,
    data.dropoff.latitude ?? null,
    data.dropoff.longitude ?? null,
    null,
    null,
  ]);

  const sql = `
    INSERT INTO booking_shuttle_requests
    (booking_id, type, address, latitude, longitude, scheduled_time, note)
    VALUES ?
  `;

  await query(sql, [values]);

  return {
    success: true,
    bookingId,
  };
}
export async function findBookingByIdForUpdate(
  conn: mysql.PoolConnection,
  bookingId: number,
) {
  const rows = await connQuery<any>(
    conn,
    `SELECT * FROM bookings WHERE booking_id = ? FOR UPDATE`,
    [bookingId],
  );

  return rows[0] || null;
}
export async function findBookingSummaryRaw(bookingId: number) {
  const rows = await query<any>(
    `
SELECT
    b.booking_id,
    b.booking_code,
    b.trip_id,
    vt.type_name AS vehicle_type_name,
    b.status,
    b.total_amount,
    b.contact_name,
    b.contact_phone,
    b.contact_email,
    b.hold_expired_at,
    b.pickup_method,
b.dropoff_method,
b.booking_type,
b.cancel_reason,
b.created_at,

t.arrival_datetime,
t.status AS trip_status,
t.ticket_price AS trip_ticket_price,

v.vehicle_name,
v.license_plate,

p.payment_method,
p.status AS payment_status,
p.transaction_code,
p.paid_at,
    t.departure_datetime,

    oc.city_name AS origin_city,
    dc.city_name AS destination_city,

    pp_pickup.point_name AS pickup_point_name,
    pp_pickup.address AS pickup_point_address,

    pp_dropoff.point_name AS dropoff_point_name,
    pp_dropoff.address AS dropoff_point_address,

    GROUP_CONCAT(
      DISTINCT sld.seat_number
      ORDER BY sld.seat_number
      SEPARATOR ','
    ) AS seatNumbersRaw,

    COUNT(DISTINCT sh.seat_hold_id) AS seat_count,

    b.seat_price AS ticket_price,

    COALESCE(SUM(bp.discount_amount),0) AS discount_amount

FROM bookings b

INNER JOIN trips t
    ON t.trip_id = b.trip_id

INNER JOIN routes r
    ON r.route_id = t.route_id

INNER JOIN cities oc
    ON oc.city_id = r.origin_city_id

INNER JOIN cities dc
    ON dc.city_id = r.destination_city_id

LEFT JOIN pickup_points pp_pickup
    ON pp_pickup.pickup_point_id = b.pickup_point_id

LEFT JOIN pickup_points pp_dropoff
    ON pp_dropoff.pickup_point_id = b.dropoff_point_id

LEFT JOIN seat_holds sh
    ON sh.booking_id = b.booking_id

LEFT JOIN seat_layout_details sld
    ON sld.seat_layout_detail_id = sh.seat_layout_detail_id

LEFT JOIN booking_promotions bp
    ON bp.booking_id = b.booking_id
LEFT JOIN vehicles v
  ON v.vehicle_id = t.vehicle_id

LEFT JOIN vehicle_types vt
  ON vt.vehicle_type_id = v.vehicle_type_id
WHERE b.booking_id = ?
LEFT JOIN payments p
  ON p.booking_id = b.booking_id
GROUP BY
    b.booking_id,
    b.booking_code,
    b.trip_id,
    vt.type_name,
    b.status,
    b.total_amount,
    b.contact_name,
    b.contact_phone,
    b.contact_email,
    b.hold_expired_at,
    t.departure_datetime,
    oc.city_name,
    dc.city_name,
    pp_pickup.point_name,
    pp_pickup.address,
    pp_dropoff.point_name,
    pp_dropoff.address
`,
    [bookingId],
  );

  return rows[0] ?? null;
}

type BookingRow = {
  bookingId: number;
  status: string;
};

export async function findBookingForHoldCancel(
  conn: mysql.PoolConnection,
  bookingId: number,
): Promise<BookingRow[]> {
  return connQuery<BookingRow>(
    conn,
    `
    SELECT
      booking_id AS bookingId,
      status
    FROM bookings
    WHERE booking_id = ?
    FOR UPDATE
    `,
    [bookingId],
  );
}

export async function deleteSeatHoldsByBookingAndSession(
  conn: mysql.PoolConnection,
  bookingId: number,
  sessionId: string,
): Promise<void> {
  await connQuery(
    conn,
    `
    DELETE FROM seat_holds
    WHERE booking_id = ?
      AND session_id = ?
    `,
    [bookingId, sessionId],
  );
}

export async function checkSeatsAlreadyBooked(
  conn: mysql.PoolConnection,
  tripId: number,
  seatIds: number[],
) {
  if (seatIds.length === 0) {
    return [];
  }

  const placeholders = seatIds.map(() => "?").join(",");

  return connQuery(
    conn,
    `
    SELECT DISTINCT sh.seat_layout_detail_id
    FROM seat_holds sh
    JOIN bookings b
      ON sh.booking_id = b.booking_id
    WHERE sh.trip_id = ?
      AND sh.seat_layout_detail_id IN (${placeholders})
      AND (
        b.status = 'CONFIRMED'
        OR (
          b.status = 'PENDING'
          AND b.hold_expired_at > NOW()
        )
      )
    `,
    [tripId, ...seatIds],
  );
}
export async function checkSeatsAlreadyHeld(
  conn: mysql.PoolConnection,
  tripId: number,
  seatIds: number[],
  sessionId: string,
) {
  if (seatIds.length === 0) {
    return [];
  }

  const placeholders = seatIds.map(() => "?").join(",");

  const rows = await connQuery(
    conn,
    `
    SELECT seat_layout_detail_id
    FROM seat_holds
    WHERE trip_id = ?
      AND seat_layout_detail_id IN (${placeholders})
      AND expired_at > NOW()
      AND session_id != ?
    `,
    [tripId, ...seatIds, sessionId],
  );

  return rows;
}
export async function insertSeatHolds(
  conn: mysql.PoolConnection,
  data: {
    tripId: number;
    seatIds: number[];
    sessionId: string;
    userId: number | null;
  },
) {
  if (data.seatIds.length === 0) {
    return;
  }

  const values = data.seatIds
    .map(() => "(?, ?, ?, ?, NOW() + INTERVAL 12 MINUTE)")
    .join(",");

  const params: any[] = [];

  for (const seatId of data.seatIds) {
    params.push(data.tripId, seatId, data.sessionId, data.userId);
  }

  await connQuery(
    conn,
    `
    INSERT INTO seat_holds (
      trip_id,
      seat_layout_detail_id,
      session_id,
      user_id,
      expired_at
    )
    VALUES ${values}

    ON DUPLICATE KEY UPDATE
      expired_at = IF(
        session_id = VALUES(session_id),
        NOW() + INTERVAL 12 MINUTE,
        expired_at
      ),
      session_id = IF(
        session_id = VALUES(session_id),
        session_id,
        session_id
      )
    `,
    params,
  );
}
export async function updateTripHoldCount(
  conn: mysql.PoolConnection,
  tripId: number,
  count: number,
) {
  await connQuery(
    conn,
    `
    UPDATE trips
    SET available_seats = available_seats - ?
    WHERE trip_id = ?
      AND available_seats >= ?
    `,
    [count, tripId, count],
  );
}

export async function cancelPendingBooking(
  conn: mysql.PoolConnection,
  bookingId: number,
) {
  await connQuery(
    conn,
    `
    UPDATE bookings
    SET status = 'CANCELLED'
    WHERE booking_id = ?
    `,
    [bookingId],
  );
}
export async function deleteBookingPromotionsByBooking(
  conn: mysql.PoolConnection,
  bookingId: number | null,
) {
  await connQuery(
    conn,
    `
    DELETE FROM booking_promotions
    WHERE booking_id = ?
    `,
    [bookingId],
  );
}

export async function countHeldSeatsBySession(
  conn: mysql.PoolConnection,
  sessionId: string,
  tripId: number,
): Promise<number> {
  const rows = await connQuery<any>(
    conn,
    `
    SELECT COUNT(*) AS count
    FROM seat_holds
    WHERE session_id = ?
      AND trip_id = ?
      AND expired_at > NOW()
    `,
    [sessionId, tripId],
  );

  return Number(rows[0]?.count || 0);
}

export async function deleteSeatHoldsBySession(
  conn: mysql.PoolConnection,
  sessionId: string,
  tripId: number,
): Promise<void> {
  await connQuery(
    conn,
    `
    DELETE FROM seat_holds
    WHERE session_id = ?
      AND trip_id = ?
    `,
    [sessionId, tripId],
  );
}

export async function restoreTripAvailableSeats(
  conn: mysql.PoolConnection,
  tripId: number,
  count: number,
) {
  await connQuery(
    conn,
    `
    UPDATE trips
    SET available_seats = available_seats + ?
    WHERE trip_id = ?
    `,
    [count, tripId],
  );
}

export async function findExistingSeatHolds(
  conn: mysql.PoolConnection,
  tripId: number,
  seatIds: number[],
): Promise<
  {
    seat_layout_detail_id: number;
    session_id: string;
  }[]
> {
  if (seatIds.length === 0) {
    return [];
  }

  const placeholders = seatIds.map(() => "?").join(",");

  return connQuery(
    conn,
    `
    SELECT
      seat_layout_detail_id,
      session_id
    FROM seat_holds
    WHERE trip_id = ?
      AND seat_layout_detail_id IN (${placeholders})
      AND expired_at > NOW()
    `,
    [tripId, ...seatIds],
  );
}
export async function createBooking(
  conn: mysql.PoolConnection,
  payload: {
    bookingCode: string;
    userId: number | null;
    tripId: number;
    pickupPointId: number | null;
    dropoffPointId: number | null;
    pickupMethod: "OFFICE" | "SHUTTLE";
    dropoffMethod: "OFFICE" | "SHUTTLE";
    totalAmount: number;
    seatPrice: number;
    contactName: string;
    contactPhone: string;
    contactEmail: string;
    holdExpiredAt: Date;
  },
) {
  const [result] = await conn.execute<ResultSetHeader>(
    `
      INSERT INTO bookings
      (
       booking_code,
  user_id,
  trip_id,
  pickup_point_id,
  dropoff_point_id,
  pickup_method,
  dropoff_method,
  status,
  seat_price,
  total_amount,
  contact_name,
  contact_phone,
  contact_email,
  hold_expired_at
      )
      VALUES
  (
  ?, ?, ?, ?, ?, ?, ?, 'PENDING',
  ?, ?, ?, ?, ?, ?
)
    `,
    [
      payload.bookingCode,
      payload.userId,
      payload.tripId,
      payload.pickupPointId,
      payload.dropoffPointId,
      payload.pickupMethod,
      payload.dropoffMethod,
      payload.seatPrice,
      payload.totalAmount,
      payload.contactName,
      payload.contactPhone,
      payload.contactEmail,
      payload.holdExpiredAt,
    ],
  );

  return result.insertId;
}

export async function findTripById(conn: mysql.PoolConnection, tripId: number) {
  const [rows] = await conn.execute<RowDataPacket[]>(
    `
      SELECT *
      FROM trips
      WHERE trip_id = ?
    `,
    [tripId],
  );

  return rows[0];
}
export async function findPromotionByCode(
  conn: mysql.PoolConnection,
  promoCode: string,
) {
  const rows = await connQuery<{
    promotionId: number;
    discountType: "PERCENT" | "FIXED";
    discountValue: number;
    minOrderAmount: number;
  }>(
    conn,
    `
    SELECT
      promotion_id AS promotionId,
      discount_type AS discountType,
      discount_value AS discountValue,
      min_order_amount AS minOrderAmount
    FROM promotions
    WHERE promo_code = ?
      AND is_active = TRUE
      AND NOW() BETWEEN start_date AND end_date
    LIMIT 1
    `,
    [promoCode],
  );

  return rows[0] ?? null;
}
export async function insertBookingPromotion(
  conn: mysql.PoolConnection,
  data: {
    bookingId: number;
    promotionId: number;
    discountAmount: number;
  },
) {
  await connQuery(
    conn,
    `
    INSERT INTO booking_promotions
    (
      booking_id,
      promotion_id,
      discount_amount
    )
    VALUES (?, ?, ?)
    `,
    [data.bookingId, data.promotionId, data.discountAmount],
  );
}
