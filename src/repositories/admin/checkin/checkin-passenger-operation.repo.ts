import {
  connExecute,
  connQuery,
  type PoolConnection,
} from "@/lib/server/mysql";

import type {
  CheckinLogAction,
  CheckinStatus,
} from "@/types/admin/checkin/checkin-operation.type";

export interface PassengerCheckinForUpdateRow {
  bookingSeatId: number;
  bookingId: number;
  tripId: number;

  checkinStatus: CheckinStatus;

  checkedInAt: string | Date | null;
  checkedInBy: number | null;
  checkinNote: string | null;

  bookingStatus: "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED";

  paymentStatus: string | null;

  tripStatus: string;
  departureDatetime: string | Date;
}

export interface UpdatedPassengerCheckinRow {
  bookingSeatId: number;
  bookingId: number;
  tripId: number;

  checkinStatus: CheckinStatus;

  checkedInAt: string | Date | null;
  checkedInBy: number | null;
  checkedInByName: string | null;

  checkinNote: string | null;
}

export async function findPassengerCheckinForUpdate(
  conn: PoolConnection,
  bookingSeatId: number,
): Promise<PassengerCheckinForUpdateRow | null> {
  const rows = await connQuery<PassengerCheckinForUpdateRow>(
    conn,
    `
      SELECT
        bs.booking_seat_id AS bookingSeatId,
        bs.booking_id AS bookingId,
        bs.trip_id AS tripId,

        bs.checkin_status AS checkinStatus,
        bs.checked_in_at AS checkedInAt,
        bs.checked_in_by AS checkedInBy,
        bs.checkin_note AS checkinNote,

        b.status AS bookingStatus,

        (
          SELECT p.status
          FROM payments p
          WHERE p.booking_id = b.booking_id
          ORDER BY p.payment_id DESC
          LIMIT 1
        ) AS paymentStatus,

        t.status AS tripStatus,
        t.departure_datetime AS departureDatetime

      FROM booking_seats bs

      INNER JOIN bookings b
        ON b.booking_id = bs.booking_id
        AND b.trip_id = bs.trip_id

      INNER JOIN trips t
        ON t.trip_id = bs.trip_id

      WHERE bs.booking_seat_id = ?

      LIMIT 1

      FOR UPDATE
    `,
    [bookingSeatId],
  );

  return rows[0] ?? null;
}

export async function insertPassengerCheckinLog(
  conn: PoolConnection,
  input: {
    bookingSeatId: number;
    bookingId: number;
    tripId: number;

    previousStatus: CheckinStatus;
    newStatus: CheckinStatus;

    action: CheckinLogAction;

    reason: string | null;

    performedBy: number;
  },
): Promise<number> {
  const result = await connExecute(
    conn,
    `
      INSERT INTO booking_seat_checkin_logs (
        booking_seat_id,
        booking_id,
        trip_id,

        previous_status,
        new_status,

        action,
        reason,

        performed_by,
        created_at
      )
      VALUES (
        ?,
        ?,
        ?,

        ?,
        ?,

        ?,
        ?,

        ?,
        NOW()
      )
    `,
    [
      input.bookingSeatId,
      input.bookingId,
      input.tripId,

      input.previousStatus,
      input.newStatus,

      input.action,
      input.reason,

      input.performedBy,
    ],
  );

  return Number(result.insertId);
}

export async function updatePassengerCheckinSnapshot(
  conn: PoolConnection,
  input: {
    bookingSeatId: number;

    checkinStatus: CheckinStatus;

    checkedInAt: Date | null;
    checkedInBy: number | null;

    checkinNote: string | null;
  },
): Promise<void> {
  const result = await connExecute(
    conn,
    `
      UPDATE booking_seats

      SET
        checkin_status = ?,
        checked_in_at = ?,
        checked_in_by = ?,
        checkin_note = ?

      WHERE booking_seat_id = ?
    `,
    [
      input.checkinStatus,
      input.checkedInAt,
      input.checkedInBy,
      input.checkinNote,
      input.bookingSeatId,
    ],
  );

  if (result.affectedRows !== 1) {
    throw new Error("Không thể cập nhật trạng thái check-in của hành khách");
  }
}

export async function findUpdatedPassengerCheckin(
  conn: PoolConnection,
  bookingSeatId: number,
): Promise<UpdatedPassengerCheckinRow | null> {
  const rows = await connQuery<UpdatedPassengerCheckinRow>(
    conn,
    `
      SELECT
        bs.booking_seat_id AS bookingSeatId,
        bs.booking_id AS bookingId,
        bs.trip_id AS tripId,

        bs.checkin_status AS checkinStatus,

        bs.checked_in_at AS checkedInAt,
        bs.checked_in_by AS checkedInBy,

        u.full_name AS checkedInByName,

        bs.checkin_note AS checkinNote

      FROM booking_seats bs

      LEFT JOIN users u
        ON u.user_id = bs.checked_in_by

      WHERE bs.booking_seat_id = ?

      LIMIT 1
    `,
    [bookingSeatId],
  );

  return rows[0] ?? null;
}
