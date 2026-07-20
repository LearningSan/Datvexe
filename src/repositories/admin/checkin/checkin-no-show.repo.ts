import type { PoolConnection, ResultSetHeader } from "mysql2/promise";

import { query, connQuery, connExecute } from "@/lib/server/mysql";

export type NoShowCandidateTripRow = {
  tripId: number;
  departureDatetime: string | Date;
};

export type NoShowTripForUpdateRow = {
  tripId: number;
  tripStatus: string;
  departureDatetime: string | Date;
};

export type NoShowSeatForUpdateRow = {
  bookingSeatId: number;

  bookingId: number;
  bookingCode: string;

  tripId: number;
  userId: number | null;

  seatNumber: string;

  previousStatus: "NOT_CHECKED_IN";
};

/**
 * Tìm các chuyến đã quá thời gian gia hạn check-in.
 */
export async function findNoShowCandidateTrips(
  limit: number,
  graceMinutes: number,
): Promise<NoShowCandidateTripRow[]> {
  return query<NoShowCandidateTripRow>(
    `
      SELECT DISTINCT
        t.trip_id AS tripId,
        t.departure_datetime AS departureDatetime

      FROM trips t

      INNER JOIN bookings b
        ON b.trip_id = t.trip_id
        AND b.status = 'CONFIRMED'

      INNER JOIN booking_seats bs
        ON bs.booking_id = b.booking_id
        AND bs.checkin_status = 'NOT_CHECKED_IN'

      WHERE
        t.status <> 'CANCELLED'

        AND DATE_ADD(
          t.departure_datetime,
          INTERVAL ? MINUTE
        ) <= NOW()

        AND (
          SELECT p.status
          FROM payments p
          WHERE p.booking_id = b.booking_id
          ORDER BY p.payment_id DESC
          LIMIT 1
        ) = 'PAID'

      ORDER BY
        t.departure_datetime ASC

      LIMIT ?
    `,
    [graceMinutes, limit],
  );
}

/**
 * Khóa chuyến trước khi xử lý NO_SHOW.
 */
export async function findNoShowTripForUpdate(
  conn: PoolConnection,
  tripId: number,
): Promise<NoShowTripForUpdateRow | null> {
  const rows = await connQuery<NoShowTripForUpdateRow>(
    conn,
    `
      SELECT
        trip_id AS tripId,
        status AS tripStatus,
        departure_datetime AS departureDatetime

      FROM trips

      WHERE trip_id = ?

      LIMIT 1

      FOR UPDATE
    `,
    [tripId],
  );

  return rows[0] ?? null;
}

/**
 * Khóa toàn bộ ghế còn NOT_CHECKED_IN của chuyến.
 */
export async function findNoShowSeatsForUpdate(
  conn: PoolConnection,
  tripId: number,
): Promise<NoShowSeatForUpdateRow[]> {
  return connQuery<NoShowSeatForUpdateRow>(
    conn,
    `
      SELECT
        bs.booking_seat_id AS bookingSeatId,

        b.booking_id AS bookingId,
        b.booking_code AS bookingCode,

        b.trip_id AS tripId,
        b.user_id AS userId,

        sld.seat_number AS seatNumber,

        bs.checkin_status AS previousStatus

      FROM booking_seats bs

      INNER JOIN bookings b
        ON b.booking_id = bs.booking_id

      INNER JOIN seat_layout_details sld
        ON sld.seat_layout_detail_id =
           bs.seat_layout_detail_id

      WHERE
        b.trip_id = ?

        AND b.status = 'CONFIRMED'

        AND bs.checkin_status = 'NOT_CHECKED_IN'

        AND (
          SELECT p.status
          FROM payments p
          WHERE p.booking_id = b.booking_id
          ORDER BY p.payment_id DESC
          LIMIT 1
        ) = 'PAID'

      ORDER BY
        b.booking_id ASC,
        sld.seat_number ASC

      FOR UPDATE
    `,
    [tripId],
  );
}

/**
 * Chuyển các ghế sang NO_SHOW.
 */
export async function updateBookingSeatsToNoShow(
  conn: PoolConnection,
  bookingSeatIds: number[],
): Promise<number> {
  if (bookingSeatIds.length === 0) {
    return 0;
  }

  const placeholders = bookingSeatIds.map(() => "?").join(", ");

  const result = await connExecute(
    conn,
    `
      UPDATE booking_seats

      SET
        checkin_status = 'NO_SHOW',
        checked_in_at = NULL,
        checked_in_by = NULL

      WHERE booking_seat_id IN (${placeholders})
        AND checkin_status = 'NOT_CHECKED_IN'
    `,
    bookingSeatIds,
  );

  return Number((result as ResultSetHeader).affectedRows ?? 0);
}
export async function insertNoShowCheckinLogs(
  conn: PoolConnection,
  seats: NoShowSeatForUpdateRow[],
): Promise<void> {
  if (seats.length === 0) {
    return;
  }

  const values = seats.map(() => "(?, ?, ?, ?, ?, ?, ?, NULL)").join(", ");

  const params: unknown[] = [];

  for (const seat of seats) {
    params.push(
      seat.bookingSeatId,
      seat.bookingId,
      seat.tripId,

      seat.previousStatus,
      "NO_SHOW",

      "MARK_NO_SHOW",

      "Tự động đánh dấu vắng mặt sau thời gian gia hạn check-in",
    );
  }

  await connExecute(
    conn,
    `
      INSERT INTO booking_seat_checkin_logs
      (
        booking_seat_id,
        booking_id,
        trip_id,

        previous_status,
        new_status,

        action,

        reason,

        performed_by
      )
      VALUES ${values}
    `,
    params,
  );
}
