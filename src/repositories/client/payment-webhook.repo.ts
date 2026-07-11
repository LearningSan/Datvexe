import type mysql from "mysql2/promise";
import type { PaymentStatus } from "@/types/client/payment/payment.type";
import { query, connQuery } from "@/lib/server/mysql";
export async function findPaymentByTransactionCode(
  conn: mysql.PoolConnection,
  transactionCode: string,
) {
  const rows = await connQuery<{
    paymentId: number;
    bookingId: number;
    amount: string | number;
    status: PaymentStatus;
    transactionCode: string;
  }>(
    conn,
    `
    SELECT
      payment_id AS paymentId,
      booking_id AS bookingId,
      amount,
      status,
      transaction_code AS transactionCode
    FROM payments
    WHERE transaction_code = ?
    LIMIT 1
    FOR UPDATE
    `,
    [transactionCode],
  );

  return rows[0] ?? null;
}

export async function updatePaymentByWebhook(
  conn: mysql.PoolConnection,
  paymentId: number,
  data: {
    status: "PAID" | "FAILED";
    paidAt: Date | null;
    gatewayTransactionId: string;
    gatewayResponse: string;
  },
): Promise<void> {
  const sql = `
    UPDATE payments
    SET
      status = ?,
      paid_at = ?,
      gateway_transaction_id = ?,
      gateway_response = ?
    WHERE payment_id = ?
  `;

  await connQuery(conn, sql, [
    data.status,
    data.paidAt,
    data.gatewayTransactionId,
    data.gatewayResponse,
    paymentId,
  ]);
}

export async function updateBookingStatus(
  conn: mysql.PoolConnection,
  bookingId: number,
  status: "CONFIRMED" | "CANCELLED" | "REFUNDED",
): Promise<void> {
  await connQuery(
    conn,
    `
    UPDATE bookings
    SET status = ?
    WHERE booking_id = ?
    `,
    [status, bookingId],
  );
}

export async function findBookingSeats(bookingId: number) {
  const sql = `
    SELECT
      seat_layout_detail_id AS seatLayoutDetailId,
      trip_id AS tripId
    FROM booking_seats
    WHERE booking_id = ?
  `;

  return await query<{
    seatLayoutDetailId: number;
    tripId: number;
  }>(sql, [bookingId]);
}

export async function incrementAvailableSeats(
  conn: mysql.PoolConnection,
  tripId: number,
  count: number,
): Promise<void> {
  const sql = `
    UPDATE trips
    SET
      available_seats = available_seats + ?,

      status = CASE
        WHEN status = 'FULL'
        THEN 'OPEN'
        ELSE status
      END

    WHERE trip_id = ?
  `;

  await connQuery(conn, sql, [count, tripId]);
}
export async function findSeatHoldsByBooking(
  conn: mysql.PoolConnection,
  bookingId: number,
) {
  return connQuery<{
    tripId: number;
    seatLayoutDetailId: number;
    seatPrice: string | number;
  }>(
    conn,
    `
    SELECT
      sh.trip_id AS tripId,
      sh.seat_layout_detail_id AS seatLayoutDetailId,
      COALESCE(t.ticket_price, st.base_price) AS seatPrice
    FROM seat_holds sh
    INNER JOIN trips t
      ON t.trip_id = sh.trip_id
    INNER JOIN schedule_templates st
      ON st.schedule_template_id = t.schedule_template_id
    WHERE sh.booking_id = ?
    FOR UPDATE
    `,
    [bookingId],
  );
}
export async function insertBookingSeatsWebhook(
  conn: mysql.PoolConnection,
  bookingId: number,
  tripId: number,
  seats: {
    seatLayoutDetailId: number;
    seatPrice: number;
  }[],
) {
  if (!seats.length) return;

  const values = seats.map((s) => [
    bookingId,
    tripId,
    s.seatLayoutDetailId,
    s.seatPrice,
  ]);

  await conn.query(
    `
    INSERT INTO booking_seats
    (
      booking_id,
      trip_id,
      seat_layout_detail_id,
      seat_price
    )
    VALUES ?
    `,
    [values],
  );
}

export async function deleteSeatHoldsByBooking(
  conn: mysql.PoolConnection,
  bookingId: number,
) {
  await connQuery(
    conn,
    `
    DELETE FROM seat_holds
    WHERE booking_id = ?
    `,
    [bookingId],
  );
}

export async function decrementAvailableSeats(
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
    `,
    [count, tripId],
  );
}

export async function findBookingByIdForNotification(bookingId: number) {
  const rows = await query<{
    bookingCode: string;
    userId: number | null;
    contactEmail: string | null;
    contactName: string;
    contactPhone: string;
    totalAmount: number;

    routeName: string;
    departureDatetime: string;
    arrivalDatetime: string;

    pickupPointName: string | null;
    pickupPointAddress: string | null;
    dropoffPointName: string | null;
    dropoffPointAddress: string | null;

    vehicleName: string | null;
    licensePlate: string | null;

    seatNumbers: string | null;
  }>(
    `
    SELECT
      b.booking_code AS bookingCode,
      b.user_id AS userId,
      b.contact_email AS contactEmail,
      b.contact_name AS contactName,
      b.contact_phone AS contactPhone,
      b.total_amount AS totalAmount,

      CONCAT(
        oc.city_name,
        ' → ',
        dc.city_name
      ) AS routeName,

      t.departure_datetime AS departureDatetime,
      t.arrival_datetime AS arrivalDatetime,

      pickup.point_name AS pickupPointName,
      pickup.address AS pickupPointAddress,

      dropoff.point_name AS dropoffPointName,
      dropoff.address AS dropoffPointAddress,

      v.vehicle_name AS vehicleName,
      v.license_plate AS licensePlate,

      GROUP_CONCAT(
        sld.seat_number
        ORDER BY sld.floor_no, sld.row_no, sld.column_no
        SEPARATOR ', '
      ) AS seatNumbers

    FROM bookings b

    INNER JOIN trips t
      ON t.trip_id = b.trip_id

    INNER JOIN routes r
      ON r.route_id = t.route_id

    INNER JOIN cities oc
      ON oc.city_id = r.origin_city_id

    INNER JOIN cities dc
      ON dc.city_id = r.destination_city_id

    LEFT JOIN pickup_points pickup
      ON pickup.pickup_point_id = b.pickup_point_id

    LEFT JOIN pickup_points dropoff
      ON dropoff.pickup_point_id = b.dropoff_point_id

    LEFT JOIN vehicles v
      ON v.vehicle_id = t.vehicle_id

    LEFT JOIN booking_seats bs
      ON bs.booking_id = b.booking_id

    LEFT JOIN seat_layout_details sld
      ON sld.seat_layout_detail_id = bs.seat_layout_detail_id

    WHERE b.booking_id = ?

    GROUP BY
      b.booking_id,
      b.booking_code,
      b.user_id,
      b.contact_email,
      b.contact_name,
      b.contact_phone,
      b.total_amount,
      oc.city_name,
      dc.city_name,
      t.departure_datetime,
      t.arrival_datetime,
      pickup.point_name,
      pickup.address,
      dropoff.point_name,
      dropoff.address,
      v.vehicle_name,
      v.license_plate

    LIMIT 1
    `,
    [bookingId],
  );

  return rows[0] ?? null;
}
