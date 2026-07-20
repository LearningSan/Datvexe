import { query } from "@/lib/server/mysql";

export type DashboardSeatSummaryRow = {
  totalSeats: number | string | null;
  notCheckedIn: number | string | null;
  checkedIn: number | string | null;
  noShow: number | string | null;
  rejected: number | string | null;
};

export type DashboardContactSummaryRow = {
  notContacted: number | string | null;
  contacted: number | string | null;
  coming: number | string | null;
  arrivingLate: number | string | null;
  unreachable: number | string | null;
  cancelRequested: number | string | null;
};

export type DashboardTripRawRow = {
  tripId: number | string;

  originName: string;
  destinationName: string;

  departureDatetime: string | Date;
  tripStatus: string;

  totalSeats: number | string | null;
  checkedInSeats: number | string | null;
  notCheckedInSeats: number | string | null;
  noShowSeats: number | string | null;
  rejectedSeats: number | string | null;

  totalBookings: number | string | null;
  contactedBookings: number | string | null;
  arrivingLateBookings: number | string | null;
  unreachableBookings: number | string | null;
};

/**
 * Tổng hợp trạng thái ghế trong khoảng thời gian.
 */
export async function findCheckinDashboardSeatSummary(input: {
  from: string;
  to: string;
}): Promise<DashboardSeatSummaryRow | null> {
  const rows = await query<DashboardSeatSummaryRow>(
    `
      SELECT
        COUNT(bs.booking_seat_id) AS totalSeats,

        SUM(
          CASE
            WHEN bs.checkin_status = 'NOT_CHECKED_IN'
            THEN 1
            ELSE 0
          END
        ) AS notCheckedIn,

        SUM(
          CASE
            WHEN bs.checkin_status = 'CHECKED_IN'
            THEN 1
            ELSE 0
          END
        ) AS checkedIn,

        SUM(
          CASE
            WHEN bs.checkin_status = 'NO_SHOW'
            THEN 1
            ELSE 0
          END
        ) AS noShow,

        SUM(
          CASE
            WHEN bs.checkin_status = 'REJECTED'
            THEN 1
            ELSE 0
          END
        ) AS rejected

      FROM trips t

      INNER JOIN bookings b
        ON b.trip_id = t.trip_id
        AND b.status = 'CONFIRMED'

      INNER JOIN booking_seats bs
        ON bs.booking_id = b.booking_id

      WHERE
        t.departure_datetime >= ?
        AND t.departure_datetime < ?

        AND t.status <> 'CANCELLED'

        AND (
          SELECT p.status
          FROM payments p
          WHERE p.booking_id = b.booking_id
          ORDER BY p.payment_id DESC
          LIMIT 1
        ) = 'PAID'
    `,
    [input.from, input.to],
  );

  return rows[0] ?? null;
}

/**
 * Tổng hợp trạng thái liên hệ hành khách.
 *
 * Đếm theo booking, không đếm theo từng ghế.
 */
export async function findCheckinDashboardContactSummary(input: {
  from: string;
  to: string;
}): Promise<DashboardContactSummaryRow | null> {
  const rows = await query<DashboardContactSummaryRow>(
    `
      SELECT
        SUM(
          CASE
            WHEN COALESCE(
              b.contact_status,
              'NOT_CONTACTED'
            ) = 'NOT_CONTACTED'
            THEN 1
            ELSE 0
          END
        ) AS notContacted,

        SUM(
          CASE
            WHEN b.contact_status = 'CONTACTED'
            THEN 1
            ELSE 0
          END
        ) AS contacted,

        SUM(
          CASE
            WHEN b.contact_status = 'COMING'
            THEN 1
            ELSE 0
          END
        ) AS coming,

        SUM(
          CASE
            WHEN b.contact_status = 'ARRIVING_LATE'
            THEN 1
            ELSE 0
          END
        ) AS arrivingLate,

        SUM(
          CASE
            WHEN b.contact_status = 'UNREACHABLE'
            THEN 1
            ELSE 0
          END
        ) AS unreachable,

        SUM(
          CASE
            WHEN b.contact_status = 'CANCEL_REQUESTED'
            THEN 1
            ELSE 0
          END
        ) AS cancelRequested

      FROM trips t

      INNER JOIN bookings b
        ON b.trip_id = t.trip_id
        AND b.status = 'CONFIRMED'

      WHERE
        t.departure_datetime >= ?
        AND t.departure_datetime < ?

        AND t.status <> 'CANCELLED'

        AND EXISTS (
          SELECT 1
          FROM booking_seats bs
          WHERE bs.booking_id = b.booking_id
        )

        AND (
          SELECT p.status
          FROM payments p
          WHERE p.booking_id = b.booking_id
          ORDER BY p.payment_id DESC
          LIMIT 1
        ) = 'PAID'
    `,
    [input.from, input.to],
  );

  return rows[0] ?? null;
}

/**
 * Danh sách chuyến phục vụ dashboard.
 */
export async function findCheckinDashboardTrips(input: {
  from: string;
  to: string;
  limit: number;
}): Promise<DashboardTripRawRow[]> {
  return query<DashboardTripRawRow>(
    `
      SELECT
        t.trip_id AS tripId,

        origin_city.city_name AS originName,
        destination_city.city_name AS destinationName,

        t.departure_datetime AS departureDatetime,
        t.status AS tripStatus,

        COUNT(DISTINCT bs.booking_seat_id) AS totalSeats,

        COUNT(
          DISTINCT CASE
            WHEN bs.checkin_status = 'CHECKED_IN'
            THEN bs.booking_seat_id
          END
        ) AS checkedInSeats,

        COUNT(
          DISTINCT CASE
            WHEN bs.checkin_status = 'NOT_CHECKED_IN'
            THEN bs.booking_seat_id
          END
        ) AS notCheckedInSeats,

        COUNT(
          DISTINCT CASE
            WHEN bs.checkin_status = 'NO_SHOW'
            THEN bs.booking_seat_id
          END
        ) AS noShowSeats,

        COUNT(
          DISTINCT CASE
            WHEN bs.checkin_status = 'REJECTED'
            THEN bs.booking_seat_id
          END
        ) AS rejectedSeats,

        COUNT(DISTINCT b.booking_id) AS totalBookings,

        COUNT(
          DISTINCT CASE
            WHEN b.contact_status = 'CONTACTED'
            THEN b.booking_id
          END
        ) AS contactedBookings,

        COUNT(
          DISTINCT CASE
            WHEN b.contact_status = 'ARRIVING_LATE'
            THEN b.booking_id
          END
        ) AS arrivingLateBookings,

        COUNT(
          DISTINCT CASE
            WHEN b.contact_status = 'UNREACHABLE'
            THEN b.booking_id
          END
        ) AS unreachableBookings

      FROM trips t

      INNER JOIN routes r
        ON r.route_id = t.route_id

      INNER JOIN cities origin_city
        ON origin_city.city_id = r.origin_city_id

      INNER JOIN cities destination_city
        ON destination_city.city_id = r.destination_city_id

      LEFT JOIN bookings b
        ON b.trip_id = t.trip_id
        AND b.status = 'CONFIRMED'

        AND (
          SELECT p.status
          FROM payments p
          WHERE p.booking_id = b.booking_id
          ORDER BY p.payment_id DESC
          LIMIT 1
        ) = 'PAID'

      LEFT JOIN booking_seats bs
        ON bs.booking_id = b.booking_id

      WHERE
        t.departure_datetime >= ?
        AND t.departure_datetime < ?

        AND t.status <> 'CANCELLED'

      GROUP BY
        t.trip_id,
        origin_city.city_name,
        destination_city.city_name,
        t.departure_datetime,
        t.status

      ORDER BY
        t.departure_datetime ASC

      LIMIT ?
    `,
    [input.from, input.to, input.limit],
  );
}
