import { connQuery, query, type PoolConnection } from "@/lib/server/mysql";

import type {
  AdminCheckinSeatItem,
  CheckinStatus,
} from "@/types/admin/checkin/checkin.type";

type CheckinBookingRow = {
  bookingId: number;
  bookingCode: string;
  tripId: number;

  passengerName: string;
  passengerPhone: string;
  passengerEmail: string | null;

  originCity: string;
  destinationCity: string;

  departureDatetime: string | Date;
  arrivalDatetime: string | Date | null;

  pickupPointName: string | null;
  pickupPointAddress: string | null;

  dropoffPointName: string | null;
  dropoffPointAddress: string | null;

  vehicleName: string | null;
  licensePlate: string | null;

  bookingStatus: "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED";

  paymentStatus:
    | "PENDING"
    | "PROCESSING"
    | "WAITING_CONFIRM"
    | "PAID"
    | "FAILED"
    | "REJECTED"
    | "EXPIRED"
    | "REFUNDED"
    | null;

  tripStatus: string;
};

type CheckinSeatRow = {
  bookingSeatId: number;
  seatLayoutDetailId: number;
  seatNumber: string;
  seatPrice: string | number;

  checkinStatus: CheckinStatus;
  checkedInAt: string | Date | null;
  checkedInBy: number | null;
  checkedInByName: string | null;
  checkinNote: string | null;
};

export async function findCheckinBookingByIdentity(input: {
  bookingId: number;
  bookingCode: string;
}): Promise<CheckinBookingRow | null> {
  const rows = await query<CheckinBookingRow>(
    `
      SELECT
        b.booking_id AS bookingId,
        b.booking_code AS bookingCode,
        b.trip_id AS tripId,

        b.contact_name AS passengerName,
        b.contact_phone AS passengerPhone,
        b.contact_email AS passengerEmail,

        oc.city_name AS originCity,
        dc.city_name AS destinationCity,

        t.departure_datetime AS departureDatetime,
        t.arrival_datetime AS arrivalDatetime,

        pp.pickup_point_name AS pickupPointName,
        pp.address AS pickupPointAddress,

        dp.pickup_point_name AS dropoffPointName,
        dp.address AS dropoffPointAddress,

        v.vehicle_name AS vehicleName,
        v.license_plate AS licensePlate,

        b.status AS bookingStatus,

        (
          SELECT p.status
          FROM payments p
          WHERE p.booking_id = b.booking_id
          ORDER BY p.payment_id DESC
          LIMIT 1
        ) AS paymentStatus,

        t.status AS tripStatus

      FROM bookings b

      INNER JOIN trips t
        ON t.trip_id = b.trip_id

      INNER JOIN routes r
        ON r.route_id = t.route_id

      INNER JOIN cities oc
        ON oc.city_id = r.origin_city_id

      INNER JOIN cities dc
        ON dc.city_id = r.destination_city_id

      LEFT JOIN pickup_points pp
        ON pp.pickup_point_id = b.pickup_point_id

      LEFT JOIN pickup_points dp
        ON dp.pickup_point_id = b.dropoff_point_id

      LEFT JOIN vehicles v
        ON v.vehicle_id = t.vehicle_id

      WHERE b.booking_id = ?
        AND b.booking_code = ?

      LIMIT 1
    `,
    [input.bookingId, input.bookingCode],
  );

  return rows[0] ?? null;
}

export async function findCheckinSeatsByBookingId(
  bookingId: number,
): Promise<AdminCheckinSeatItem[]> {
  const rows = await query<CheckinSeatRow>(
    `
      SELECT
        bs.booking_seat_id AS bookingSeatId,
        bs.seat_layout_detail_id AS seatLayoutDetailId,

        sld.seat_number AS seatNumber,
        bs.seat_price AS seatPrice,

        bs.checkin_status AS checkinStatus,
        bs.checked_in_at AS checkedInAt,
        bs.checked_in_by AS checkedInBy,

        u.full_name AS checkedInByName,

        bs.checkin_note AS checkinNote

      FROM booking_seats bs

      INNER JOIN seat_layout_details sld
        ON sld.seat_layout_detail_id =
          bs.seat_layout_detail_id

      LEFT JOIN users u
        ON u.user_id = bs.checked_in_by

      WHERE bs.booking_id = ?

      ORDER BY
        sld.seat_number ASC
    `,
    [bookingId],
  );

  return rows.map((row) => ({
    bookingSeatId: Number(row.bookingSeatId),
    seatLayoutDetailId: Number(row.seatLayoutDetailId),
    seatNumber: row.seatNumber,
    seatPrice: Number(row.seatPrice),

    checkinStatus: row.checkinStatus,

    checkedInAt: row.checkedInAt
      ? new Date(row.checkedInAt).toISOString()
      : null,

    checkedInBy: row.checkedInBy == null ? null : Number(row.checkedInBy),

    checkedInByName: row.checkedInByName,
    checkinNote: row.checkinNote,

    canCheckin: row.checkinStatus === "NOT_CHECKED_IN",
  }));
}

export async function findBookingForCheckinUpdate(
  conn: PoolConnection,
  bookingId: number,
) {
  const rows = await connQuery<{
    bookingId: number;
    bookingCode: string;
    tripId: number;
    bookingStatus: "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED";
    tripStatus: string;
    departureDatetime: string | Date;
    paymentStatus: string | null;
  }>(
    conn,
    `
      SELECT
        b.booking_id AS bookingId,
        b.booking_code AS bookingCode,
        b.trip_id AS tripId,
        b.status AS bookingStatus,

        t.status AS tripStatus,
        t.departure_datetime AS departureDatetime,

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

      WHERE b.booking_id = ?

      LIMIT 1
      FOR UPDATE
    `,
    [bookingId],
  );

  return rows[0] ?? null;
}

export async function findBookingSeatsForCheckinUpdate(
  conn: PoolConnection,
  input: {
    bookingId: number;
    bookingSeatIds: number[];
  },
) {
  if (!input.bookingSeatIds.length) {
    return [];
  }

  const placeholders = input.bookingSeatIds.map(() => "?").join(", ");

  return connQuery<{
    bookingSeatId: number;
    bookingId: number;
    checkinStatus: CheckinStatus;
  }>(
    conn,
    `
      SELECT
        booking_seat_id AS bookingSeatId,
        booking_id AS bookingId,
        checkin_status AS checkinStatus

      FROM booking_seats

      WHERE booking_id = ?
        AND booking_seat_id IN (${placeholders})

      ORDER BY booking_seat_id

      FOR UPDATE
    `,
    [input.bookingId, ...input.bookingSeatIds],
  );
}

export async function updateBookingSeatsCheckedIn(
  conn: PoolConnection,
  input: {
    bookingSeatIds: number[];
    checkedInBy: number;
    note: string | null;
  },
): Promise<void> {
  if (!input.bookingSeatIds.length) {
    return;
  }

  const placeholders = input.bookingSeatIds.map(() => "?").join(", ");

  await connQuery(
    conn,
    `
      UPDATE booking_seats

      SET
        checkin_status = 'CHECKED_IN',
        checked_in_at = NOW(),
        checked_in_by = ?,
        checkin_note = ?

      WHERE booking_seat_id IN (${placeholders})
        AND checkin_status = 'NOT_CHECKED_IN'
    `,
    [input.checkedInBy, input.note, ...input.bookingSeatIds],
  );
}
