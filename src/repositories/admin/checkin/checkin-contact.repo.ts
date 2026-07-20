import {
  connExecute,
  connQuery,
  query,
  type PoolConnection,
} from "@/lib/server/mysql";
import type {
  PassengerContactLogItem,
  PassengerContactStatus,
  PassengerContactType,
} from "@/types/admin/checkin/checkin-operation.type";

export interface ContactBookingForUpdateRow {
  bookingId: number;
  bookingCode: string;

  tripId: number;

  bookingStatus: "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED";

  tripStatus: string;

  departureDatetime: Date | string;

  contactStatus: PassengerContactStatus;

  expectedArrivalAt: Date | string | null;
  lastContactedAt: Date | string | null;
  lastContactedBy: number | null;

  contactNote: string | null;

  paymentStatus: string | null;
}

interface PassengerContactLogRow {
  contactLogId: number;

  bookingId: number;
  tripId: number;

  contactType: PassengerContactType;

  previousStatus: PassengerContactStatus;
  newStatus: PassengerContactStatus;

  expectedArrivalAt: Date | string | null;
  note: string | null;

  contactedBy: number | null;
  contactedByName: string | null;

  contactedAt: Date | string;
}

interface UpdatedContactSnapshotRow {
  bookingId: number;
  tripId: number;

  contactStatus: PassengerContactStatus;

  expectedArrivalAt: Date | string | null;
  lastContactedAt: Date | string;

  lastContactedBy: number;
  lastContactedByName: string | null;

  contactNote: string | null;
}

export async function findContactBookingForUpdate(
  conn: PoolConnection,
  input: {
    bookingId: number;
    tripId: number;
  },
): Promise<ContactBookingForUpdateRow | null> {
  const rows = await connQuery<ContactBookingForUpdateRow>(
    conn,
    `
      SELECT
        b.booking_id AS bookingId,
        b.booking_code AS bookingCode,

        b.trip_id AS tripId,

        b.status AS bookingStatus,

        t.status AS tripStatus,
        t.departure_datetime AS departureDatetime,

        COALESCE(
          b.contact_status,
          'NOT_CONTACTED'
        ) AS contactStatus,

        b.expected_arrival_at AS expectedArrivalAt,
        b.last_contacted_at AS lastContactedAt,
        b.last_contacted_by AS lastContactedBy,

        b.contact_note AS contactNote,

        (
          SELECT p.status
          FROM payments p
          WHERE p.booking_id = b.booking_id
          ORDER BY p.payment_id DESC
          LIMIT 1
        ) AS paymentStatus

      FROM bookings b

      INNER JOIN trips t
        ON t.trip_id = b.trip_id

      WHERE
        b.booking_id = ?
        AND b.trip_id = ?

      LIMIT 1

      FOR UPDATE
    `,
    [input.bookingId, input.tripId],
  );

  return rows[0] ?? null;
}

export async function hasRemainingUncheckedSeats(
  conn: PoolConnection,
  bookingId: number,
): Promise<boolean> {
  const rows = await connQuery<{
    remainingCount: number | string;
  }>(
    conn,
    `
      SELECT
        COUNT(*) AS remainingCount

      FROM booking_seats

      WHERE
        booking_id = ?
        AND checkin_status = 'NOT_CHECKED_IN'
    `,
    [bookingId],
  );

  return Number(rows[0]?.remainingCount ?? 0) > 0;
}

export async function insertPassengerContactLog(
  conn: PoolConnection,
  input: {
    bookingId: number;
    tripId: number;

    contactType: PassengerContactType;

    previousStatus: PassengerContactStatus;
    newStatus: PassengerContactStatus;

    expectedArrivalAt: Date | null;
    note: string | null;

    contactedBy: number;
  },
): Promise<number> {
  const result = await connExecute(
    conn,
    `
      INSERT INTO passenger_contact_logs (
        booking_id,
        trip_id,

        contact_type,

        previous_status,
        new_status,

        expected_arrival_at,
        note,

        contacted_by,
        contacted_at
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
      input.bookingId,
      input.tripId,

      input.contactType,

      input.previousStatus,
      input.newStatus,

      input.expectedArrivalAt,
      input.note,

      input.contactedBy,
    ],
  );

  return Number(result.insertId);
}

export async function updateBookingContactSnapshot(
  conn: PoolConnection,
  input: {
    bookingId: number;

    contactStatus: PassengerContactStatus;

    expectedArrivalAt: Date | null;

    contactedBy: number;

    note: string | null;
  },
): Promise<void> {
  const result = await connExecute(
    conn,
    `
      UPDATE bookings

      SET
        contact_status = ?,
        expected_arrival_at = ?,
        last_contacted_at = NOW(),
        last_contacted_by = ?,
        contact_note = ?

      WHERE booking_id = ?
    `,
    [
      input.contactStatus,
      input.expectedArrivalAt,
      input.contactedBy,
      input.note,
      input.bookingId,
    ],
  );

  if (result.affectedRows !== 1) {
    throw new Error("Không thể cập nhật trạng thái liên hệ của booking");
  }
}

export async function findUpdatedContactSnapshot(
  conn: PoolConnection,
  bookingId: number,
): Promise<UpdatedContactSnapshotRow | null> {
  const rows = await connQuery<UpdatedContactSnapshotRow>(
    conn,
    `
      SELECT
        b.booking_id AS bookingId,
        b.trip_id AS tripId,

        b.contact_status AS contactStatus,

        b.expected_arrival_at AS expectedArrivalAt,
        b.last_contacted_at AS lastContactedAt,

        b.last_contacted_by AS lastContactedBy,

        u.full_name AS lastContactedByName,

        b.contact_note AS contactNote

      FROM bookings b

      LEFT JOIN users u
        ON u.user_id = b.last_contacted_by

      WHERE b.booking_id = ?

      LIMIT 1
    `,
    [bookingId],
  );

  return rows[0] ?? null;
}

export async function findPassengerContactHistory(input: {
  bookingId: number;
  tripId: number;
}): Promise<PassengerContactLogItem[]> {
  const rows = await query<PassengerContactLogRow>(
    `
      SELECT
        pcl.contact_log_id AS contactLogId,

        pcl.booking_id AS bookingId,
        pcl.trip_id AS tripId,

        pcl.contact_type AS contactType,

        pcl.previous_status AS previousStatus,
        pcl.new_status AS newStatus,

        pcl.expected_arrival_at AS expectedArrivalAt,
        pcl.note AS note,

        pcl.contacted_by AS contactedBy,
        u.full_name AS contactedByName,

        pcl.contacted_at AS contactedAt

      FROM passenger_contact_logs pcl

      LEFT JOIN users u
        ON u.user_id = pcl.contacted_by

      WHERE
        pcl.booking_id = ?
        AND pcl.trip_id = ?

      ORDER BY
        pcl.contacted_at DESC,
        pcl.contact_log_id DESC
    `,
    [input.bookingId, input.tripId],
  );

  return rows.map((row) => ({
    contactLogId: Number(row.contactLogId),

    bookingId: Number(row.bookingId),
    tripId: Number(row.tripId),

    contactType: row.contactType,

    previousStatus: row.previousStatus,
    newStatus: row.newStatus,

    expectedArrivalAt: row.expectedArrivalAt
      ? new Date(row.expectedArrivalAt).toISOString()
      : null,

    note: row.note,

    contactedBy: row.contactedBy == null ? null : Number(row.contactedBy),

    contactedByName: row.contactedByName,

    contactedAt: new Date(row.contactedAt).toISOString(),
  }));
}
