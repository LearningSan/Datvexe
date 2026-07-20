import { query } from "@/lib/server/mysql";

import type {
  CheckinStatus,
  PassengerContactStatus,
} from "@/types/admin/checkin/checkin-operation.type";

export interface UpcomingCheckinTripRow {
  tripId: number;

  originName: string;
  destinationName: string;

  departureDatetime: Date | string;

  vehicleName: string | null;
  licensePlate: string | null;

  tripStatus: string;

  totalSeats: number | string | null;
  checkedInCount: number | string | null;
  notCheckedInCount: number | string | null;
  noShowCount: number | string | null;
  rejectedCount: number | string | null;

  comingCount: number | string | null;
  arrivingLateCount: number | string | null;
  unreachableCount: number | string | null;
}

export interface TripCheckinInfoRow {
  tripId: number;

  originName: string;
  destinationName: string;

  departureDatetime: Date | string;

  vehicleName: string | null;
  licensePlate: string | null;

  tripStatus: string;
}

export interface TripCheckinPassengerRow {
  bookingId: number;
  bookingSeatId: number;

  bookingCode: string;
  tripId: number;

  seatNumber: string;
  seatPrice: number | string;

  passengerName: string;
  passengerPhone: string;
  passengerEmail: string | null;

  pickupPointName: string | null;
  pickupPointAddress: string | null;

  checkinStatus: CheckinStatus;

  checkedInAt: Date | string | null;
  checkedInByName: string | null;

  contactStatus: PassengerContactStatus;

  expectedArrivalAt: Date | string | null;
  lastContactedAt: Date | string | null;
  lastContactedByName: string | null;

  contactNote: string | null;
}

export async function findUpcomingCheckinTrips(
  hours: number,
  limit: number,
): Promise<UpcomingCheckinTripRow[]> {
  return query<UpcomingCheckinTripRow>(
    `
      SELECT
        t.trip_id AS tripId,

        origin_city.city_name AS originName,
        destination_city.city_name AS destinationName,

        t.departure_datetime AS departureDatetime,

        v.vehicle_name AS vehicleName,
        v.license_plate AS licensePlate,

        t.status AS tripStatus,

        COUNT(bs.booking_seat_id) AS totalSeats,

        COALESCE(
          SUM(
            CASE
              WHEN bs.checkin_status = 'CHECKED_IN'
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS checkedInCount,

        COALESCE(
          SUM(
            CASE
              WHEN bs.checkin_status = 'NOT_CHECKED_IN'
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS notCheckedInCount,

        COALESCE(
          SUM(
            CASE
              WHEN bs.checkin_status = 'NO_SHOW'
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS noShowCount,

        COALESCE(
          SUM(
            CASE
              WHEN bs.checkin_status = 'REJECTED'
              THEN 1
              ELSE 0
            END
          ),
          0
        ) AS rejectedCount,

        COUNT(
          DISTINCT CASE
            WHEN
              b.contact_status = 'COMING'
              AND bs.checkin_status = 'NOT_CHECKED_IN'
            THEN b.booking_id
          END
        ) AS comingCount,

        COUNT(
          DISTINCT CASE
            WHEN
              b.contact_status = 'ARRIVING_LATE'
              AND bs.checkin_status = 'NOT_CHECKED_IN'
            THEN b.booking_id
          END
        ) AS arrivingLateCount,

        COUNT(
          DISTINCT CASE
            WHEN
              b.contact_status = 'UNREACHABLE'
              AND bs.checkin_status = 'NOT_CHECKED_IN'
            THEN b.booking_id
          END
        ) AS unreachableCount

      FROM trips t

      INNER JOIN routes r
        ON r.route_id = t.route_id

      INNER JOIN cities origin_city
        ON origin_city.city_id = r.origin_city_id

      INNER JOIN cities destination_city
        ON destination_city.city_id = r.destination_city_id

      LEFT JOIN vehicles v
        ON v.vehicle_id = t.vehicle_id

      LEFT JOIN bookings b
        ON b.trip_id = t.trip_id

        AND b.status = 'CONFIRMED'

        AND (
          SELECT latest_payment.status
          FROM payments latest_payment
          WHERE latest_payment.booking_id = b.booking_id
          ORDER BY latest_payment.payment_id DESC
          LIMIT 1
        ) = 'PAID'

      LEFT JOIN booking_seats bs
        ON bs.booking_id = b.booking_id

      WHERE
        t.departure_datetime >= DATE_SUB(
          NOW(),
          INTERVAL 2 HOUR
        )

        AND t.departure_datetime <= DATE_ADD(
          NOW(),
          INTERVAL ? HOUR
        )

        AND t.status IN (
          'OPEN',
          'FULL',
          'RUNNING'
        )

      GROUP BY
        t.trip_id,
        origin_city.city_name,
        destination_city.city_name,
        t.departure_datetime,
        v.vehicle_name,
        v.license_plate,
        t.status

      ORDER BY
        t.departure_datetime ASC

      LIMIT ?
    `,
    [hours, limit],
  );
}

export async function findTripCheckinInfo(
  tripId: number,
): Promise<TripCheckinInfoRow | null> {
  const rows = await query<TripCheckinInfoRow>(
    `
      SELECT
        t.trip_id AS tripId,

        origin_city.city_name AS originName,
        destination_city.city_name AS destinationName,

        t.departure_datetime AS departureDatetime,

        v.vehicle_name AS vehicleName,
        v.license_plate AS licensePlate,

        t.status AS tripStatus

      FROM trips t

      INNER JOIN routes r
        ON r.route_id = t.route_id

      INNER JOIN cities origin_city
        ON origin_city.city_id = r.origin_city_id

      INNER JOIN cities destination_city
        ON destination_city.city_id = r.destination_city_id

      LEFT JOIN vehicles v
        ON v.vehicle_id = t.vehicle_id

      WHERE t.trip_id = ?

      LIMIT 1
    `,
    [tripId],
  );

  return rows[0] ?? null;
}

export async function findTripCheckinPassengers(
  tripId: number,
): Promise<TripCheckinPassengerRow[]> {
  return query<TripCheckinPassengerRow>(
    `
      SELECT
        b.booking_id AS bookingId,
        bs.booking_seat_id AS bookingSeatId,

        b.booking_code AS bookingCode,
        b.trip_id AS tripId,

        sld.seat_number AS seatNumber,
        bs.seat_price AS seatPrice,

        b.contact_name AS passengerName,
        b.contact_phone AS passengerPhone,
        b.contact_email AS passengerEmail,

        pickup.pickup_point_name AS pickupPointName,
        pickup.address AS pickupPointAddress,

        bs.checkin_status AS checkinStatus,

        bs.checked_in_at AS checkedInAt,

        checked_in_user.full_name AS checkedInByName,

        b.contact_status AS contactStatus,

        b.expected_arrival_at AS expectedArrivalAt,
        b.last_contacted_at AS lastContactedAt,

        contacted_user.full_name AS lastContactedByName,

        b.contact_note AS contactNote

      FROM booking_seats bs

      INNER JOIN bookings b
        ON b.booking_id = bs.booking_id

      INNER JOIN seat_layout_details sld
        ON sld.seat_layout_detail_id =
          bs.seat_layout_detail_id

      LEFT JOIN pickup_points pickup
        ON pickup.pickup_point_id =
          b.pickup_point_id

      LEFT JOIN users checked_in_user
        ON checked_in_user.user_id =
          bs.checked_in_by

      LEFT JOIN users contacted_user
        ON contacted_user.user_id =
          b.last_contacted_by

      WHERE
        b.trip_id = ?

        AND b.status = 'CONFIRMED'

        AND (
          SELECT latest_payment.status
          FROM payments latest_payment
          WHERE latest_payment.booking_id = b.booking_id
          ORDER BY latest_payment.payment_id DESC
          LIMIT 1
        ) = 'PAID'

      ORDER BY
        b.booking_id ASC,
        sld.seat_number ASC
    `,
    [tripId],
  );
}
