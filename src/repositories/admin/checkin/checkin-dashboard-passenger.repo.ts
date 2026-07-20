import { query } from "@/lib/server/mysql";

import type {
  CheckinDashboardPassengerRepositoryQuery,
  CheckinDashboardPassengerRow,
  CheckinDashboardPassengerSort,
  CheckinDashboardTripInfoRow,
} from "@/types/admin/checkin/checkin-dashboard-passenger.type";

type CountRow = {
  totalItems: string | number;
};

function buildOrderBy(sort: CheckinDashboardPassengerSort): string {
  switch (sort) {
    case "SEAT_DESC":
      return "sld.seat_number DESC, bs.booking_seat_id DESC";

    case "NAME_ASC":
      return `
        b.contact_name ASC,
        sld.seat_number ASC,
        bs.booking_seat_id ASC
      `;

    case "NAME_DESC":
      return `
        b.contact_name DESC,
        sld.seat_number ASC,
        bs.booking_seat_id ASC
      `;

    /*
     * ALERT_DESC được sắp xếp chính xác trong service,
     * vì alert được tính bằng helper TypeScript.
     */
    case "ALERT_DESC":
    case "SEAT_ASC":
    default:
      return "sld.seat_number ASC, bs.booking_seat_id ASC";
  }
}

function buildFilterConditions(
  input: Pick<
    CheckinDashboardPassengerRepositoryQuery,
    "checkinStatus" | "contactStatus" | "keyword"
  >,
): {
  sql: string;
  params: unknown[];
} {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (input.checkinStatus) {
    conditions.push("bs.checkin_status = ?");
    params.push(input.checkinStatus);
  }

  if (input.contactStatus) {
    conditions.push("b.contact_status = ?");
    params.push(input.contactStatus);
  }

  if (input.keyword) {
    const pattern = `%${input.keyword}%`;

    conditions.push(`
      (
        b.booking_code LIKE ?
        OR b.contact_name LIKE ?
        OR b.contact_phone LIKE ?
        OR b.contact_email LIKE ?
        OR sld.seat_number LIKE ?
      )
    `);

    params.push(pattern, pattern, pattern, pattern, pattern);
  }

  if (conditions.length === 0) {
    return {
      sql: "",
      params: [],
    };
  }

  return {
    sql: `AND ${conditions.join(" AND ")}`,
    params,
  };
}

/**
 * Lấy thông tin chuyến cho header Passenger Monitor.
 */
export async function findCheckinDashboardTripInfo(
  tripId: number,
): Promise<CheckinDashboardTripInfoRow | null> {
  const rows = await query<CheckinDashboardTripInfoRow>(
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

        t.status AS tripStatus

      FROM trips t

      INNER JOIN routes r
        ON r.route_id = t.route_id

      INNER JOIN cities oc
        ON oc.city_id = r.origin_city_id

      INNER JOIN cities dc
        ON dc.city_id = r.destination_city_id

      LEFT JOIN vehicles v
        ON v.vehicle_id = t.vehicle_id

      WHERE t.trip_id = ?

      LIMIT 1
    `,
    [tripId],
  );

  return rows[0] ?? null;
}

/**
 * Đếm số ghế/hành khách theo bộ lọc SQL.
 *
 * Alert chưa được lọc tại đây vì alert được tính trong service.
 */
export async function countCheckinDashboardPassengers(
  input: Omit<
    CheckinDashboardPassengerRepositoryQuery,
    "offset" | "limit" | "sort"
  >,
): Promise<number> {
  const filter = buildFilterConditions(input);

  const rows = await query<CountRow>(
    `
      SELECT
        COUNT(DISTINCT bs.booking_seat_id) AS totalItems

      FROM booking_seats bs

      INNER JOIN bookings b
        ON b.booking_id = bs.booking_id
        AND b.trip_id = bs.trip_id

      INNER JOIN seat_layout_details sld
        ON sld.seat_layout_detail_id =
          bs.seat_layout_detail_id

      WHERE bs.trip_id = ?
        AND b.status = 'CONFIRMED'

        AND EXISTS (
          SELECT 1
          FROM payments paid_payment
          WHERE paid_payment.booking_id = b.booking_id
            AND paid_payment.status = 'PAID'
        )

        ${filter.sql}
    `,
    [input.tripId, ...filter.params],
  );

  return Number(rows[0]?.totalItems ?? 0);
}

/**
 * Danh sách từng ghế/hành khách của chuyến.
 */
export async function findCheckinDashboardPassengers(
  input: CheckinDashboardPassengerRepositoryQuery,
): Promise<CheckinDashboardPassengerRow[]> {
  const filter = buildFilterConditions(input);
  const orderBy = buildOrderBy(input.sort);

  return query<CheckinDashboardPassengerRow>(
    `
      SELECT
        bs.booking_seat_id AS bookingSeatId,
        b.booking_id AS bookingId,
        b.booking_code AS bookingCode,

        sld.seat_number AS seatNumber,

        b.contact_name AS passengerName,
        b.contact_phone AS passengerPhone,
        b.contact_email AS passengerEmail,

        bs.checkin_status AS checkinStatus,
        bs.checked_in_at AS checkedInAt,
        bs.checkin_note AS checkinNote,

        b.contact_status AS contactStatus,
        b.expected_arrival_at AS expectedArrivalAt,
        b.last_contacted_at AS lastContactedAt,
        b.contact_note AS contactNote,

        b.pickup_method AS pickupMethod,
        pp.point_name AS pickupPointName,
        pp.address AS pickupAddress

      FROM booking_seats bs

      INNER JOIN bookings b
        ON b.booking_id = bs.booking_id
        AND b.trip_id = bs.trip_id

      INNER JOIN seat_layout_details sld
        ON sld.seat_layout_detail_id =
          bs.seat_layout_detail_id

      LEFT JOIN pickup_points pp
        ON pp.pickup_point_id = b.pickup_point_id

      WHERE bs.trip_id = ?
        AND b.status = 'CONFIRMED'

        AND EXISTS (
          SELECT 1
          FROM payments paid_payment
          WHERE paid_payment.booking_id = b.booking_id
            AND paid_payment.status = 'PAID'
        )

        ${filter.sql}

      ORDER BY ${orderBy}

      LIMIT ?
      OFFSET ?
    `,
    [input.tripId, ...filter.params, input.limit, input.offset],
  );
}
