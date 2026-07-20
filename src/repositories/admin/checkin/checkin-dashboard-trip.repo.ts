// src/repositories/admin/checkin/checkin-dashboard-trip.repo.ts

import { query } from "@/lib/server/mysql";

import type {
  CheckinDashboardTripRepositoryQuery,
  CheckinDashboardTripRow,
  CheckinDashboardTripSort,
} from "@/types/admin/checkin/checkin-dashboard-trip.type";

type CountRow = {
  totalItems: string | number;
};

function buildOrderBy(sort: CheckinDashboardTripSort): string {
  switch (sort) {
    case "DEPARTURE_DESC":
      return "t.departure_datetime DESC, t.trip_id DESC";

    case "CHECKIN_RATE_ASC":
      return `
        CASE
          WHEN COUNT(DISTINCT bs.booking_seat_id) = 0 THEN 0
          ELSE
            COUNT(
              DISTINCT CASE
                WHEN bs.checkin_status = 'CHECKED_IN'
                THEN bs.booking_seat_id
              END
            ) / COUNT(DISTINCT bs.booking_seat_id)
        END ASC,
        t.departure_datetime ASC,
        t.trip_id ASC
      `;

    case "CHECKIN_RATE_DESC":
      return `
        CASE
          WHEN COUNT(DISTINCT bs.booking_seat_id) = 0 THEN 0
          ELSE
            COUNT(
              DISTINCT CASE
                WHEN bs.checkin_status = 'CHECKED_IN'
                THEN bs.booking_seat_id
              END
            ) / COUNT(DISTINCT bs.booking_seat_id)
        END DESC,
        t.departure_datetime ASC,
        t.trip_id ASC
      `;

    case "DEPARTURE_ASC":
    default:
      return "t.departure_datetime ASC, t.trip_id ASC";
  }
}

function buildKeywordCondition(keyword: string | null): {
  sql: string;
  params: string[];
} {
  if (!keyword) {
    return {
      sql: "",
      params: [],
    };
  }

  const pattern = `%${keyword}%`;

  return {
    sql: `
      AND (
        CAST(t.trip_id AS CHAR) LIKE ?
        OR oc.city_name LIKE ?
        OR dc.city_name LIKE ?
        OR CONCAT(oc.city_name, ' → ', dc.city_name) LIKE ?
        OR v.internal_code LIKE ?
        OR v.license_plate LIKE ?
        OR v.vehicle_name LIKE ?
        OR EXISTS (
          SELECT 1
          FROM trip_drivers keyword_td
          INNER JOIN drivers keyword_d
            ON keyword_d.driver_id = keyword_td.driver_id
          INNER JOIN users keyword_u
            ON keyword_u.user_id = keyword_d.user_id
          WHERE keyword_td.trip_id = t.trip_id
            AND keyword_u.full_name LIKE ?
        )
      )
    `,
    params: [
      pattern,
      pattern,
      pattern,
      pattern,
      pattern,
      pattern,
      pattern,
      pattern,
    ],
  };
}

export async function countCheckinDashboardTrips(
  input: Omit<CheckinDashboardTripRepositoryQuery, "offset" | "limit" | "sort">,
): Promise<number> {
  const keywordCondition = buildKeywordCondition(input.keyword);

  const rows = await query<CountRow>(
    `
      SELECT
        COUNT(DISTINCT t.trip_id) AS totalItems

      FROM trips t

      INNER JOIN routes r
        ON r.route_id = t.route_id

      INNER JOIN cities oc
        ON oc.city_id = r.origin_city_id

      INNER JOIN cities dc
        ON dc.city_id = r.destination_city_id

      LEFT JOIN vehicles v
        ON v.vehicle_id = t.vehicle_id

      WHERE t.departure_datetime >= ?
        AND t.departure_datetime < ?
        AND t.status <> 'CANCELLED'
        ${keywordCondition.sql}
    `,
    [input.from, input.to, ...keywordCondition.params],
  );

  return Number(rows[0]?.totalItems ?? 0);
}

export async function findCheckinDashboardTrips(
  input: CheckinDashboardTripRepositoryQuery,
): Promise<CheckinDashboardTripRow[]> {
  const keywordCondition = buildKeywordCondition(input.keyword);
  const orderBy = buildOrderBy(input.sort);

  return query<CheckinDashboardTripRow>(
    `
      SELECT
        t.trip_id AS tripId,

        CONCAT(
          oc.city_name,
          ' → ',
          dc.city_name
        ) AS routeName,

        t.departure_datetime AS departureDatetime,

        v.vehicle_name AS vehicleName,
        v.license_plate AS licensePlate,

        GROUP_CONCAT(
          DISTINCT du.full_name
          ORDER BY
            CASE td.assigned_role
              WHEN 'MAIN' THEN 1
              WHEN 'ASSISTANT' THEN 2
              WHEN 'SHUTTLE' THEN 3
              ELSE 4
            END,
            du.full_name
          SEPARATOR ', '
        ) AS driverNames,

        COUNT(
          DISTINCT bs.booking_seat_id
        ) AS totalSeats,

        COUNT(
          DISTINCT CASE
            WHEN bs.checkin_status = 'CHECKED_IN'
            THEN bs.booking_seat_id
          END
        ) AS checkedIn,

        COUNT(
          DISTINCT CASE
            WHEN bs.checkin_status = 'NOT_CHECKED_IN'
            THEN bs.booking_seat_id
          END
        ) AS notCheckedIn,

        COUNT(
          DISTINCT CASE
            WHEN bs.checkin_status = 'NO_SHOW'
            THEN bs.booking_seat_id
          END
        ) AS noShow,

        COUNT(
          DISTINCT CASE
            WHEN bs.checkin_status = 'REJECTED'
            THEN bs.booking_seat_id
          END
        ) AS rejected,

        COUNT(
          DISTINCT CASE
            WHEN b.contact_status = 'NOT_CONTACTED'
            THEN b.booking_id
          END
        ) AS notContacted,

        COUNT(
          DISTINCT CASE
            WHEN b.contact_status = 'NOTIFIED'
            THEN b.booking_id
          END
        ) AS notified,

        COUNT(
          DISTINCT CASE
            WHEN b.contact_status = 'CONTACTED'
            THEN b.booking_id
          END
        ) AS contacted,

        COUNT(
          DISTINCT CASE
            WHEN b.contact_status = 'COMING'
            THEN b.booking_id
          END
        ) AS coming,

        COUNT(
          DISTINCT CASE
            WHEN b.contact_status = 'ARRIVING_LATE'
            THEN b.booking_id
          END
        ) AS arrivingLate,

        COUNT(
          DISTINCT CASE
            WHEN b.contact_status = 'UNREACHABLE'
            THEN b.booking_id
          END
        ) AS unreachable,

        COUNT(
          DISTINCT CASE
            WHEN b.contact_status = 'CANCEL_REQUESTED'
            THEN b.booking_id
          END
        ) AS cancelRequested,

        COUNT(
          DISTINCT b.booking_id
        ) AS totalPassengers

      FROM trips t

      INNER JOIN routes r
        ON r.route_id = t.route_id

      INNER JOIN cities oc
        ON oc.city_id = r.origin_city_id

      INNER JOIN cities dc
        ON dc.city_id = r.destination_city_id

      LEFT JOIN vehicles v
        ON v.vehicle_id = t.vehicle_id

      LEFT JOIN trip_drivers td
        ON td.trip_id = t.trip_id

      LEFT JOIN drivers d
        ON d.driver_id = td.driver_id

      LEFT JOIN users du
        ON du.user_id = d.user_id

      LEFT JOIN bookings b
        ON b.trip_id = t.trip_id
        AND b.status = 'CONFIRMED'
        AND EXISTS (
          SELECT 1
          FROM payments paid_payment
          WHERE paid_payment.booking_id = b.booking_id
            AND paid_payment.status = 'PAID'
        )

      LEFT JOIN booking_seats bs
        ON bs.booking_id = b.booking_id
        AND bs.trip_id = t.trip_id

      WHERE t.departure_datetime >= ?
        AND t.departure_datetime < ?
        AND t.status <> 'CANCELLED'
        ${keywordCondition.sql}

      GROUP BY
        t.trip_id,
        t.departure_datetime,
        oc.city_name,
        dc.city_name,
        v.vehicle_name,
        v.license_plate

      ORDER BY ${orderBy}

      LIMIT ?
      OFFSET ?
    `,
    [
      input.from,
      input.to,
      ...keywordCondition.params,
      input.limit,
      input.offset,
    ],
  );
}
