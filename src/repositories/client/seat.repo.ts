import { query } from "@/lib/server/mysql";

import { Seat } from "@/types/client/seat/seat.type";

import { TripSeatMeta } from "@/types/client/seat/seat-meta.type";

export async function findTripSeats(tripId: number): Promise<Seat[]> {
  const sql = `
        SELECT
            sld.seat_layout_detail_id AS seatId,
            sld.seat_number AS seatNumber,
            sld.seat_type AS seatType,
            sld.floor_no AS floorNo,
            sld.row_no AS rowNo,
            sld.column_no AS columnNo,
            CASE
                WHEN b.booking_id IS NOT NULL
                    THEN 'BOOKED'

                WHEN sh.seat_hold_id IS NOT NULL
                    THEN 'HELD'

                ELSE 'AVAILABLE'
            END AS status
        FROM trips t
        JOIN vehicles v
            ON v.vehicle_id = t.vehicle_id
        JOIN seat_layouts sl
            ON sl.seat_layout_id = v.seat_layout_id
        JOIN seat_layout_details sld
            ON sld.seat_layout_id = sl.seat_layout_id
        LEFT JOIN booking_seats bs
            ON bs.trip_id = t.trip_id
            AND bs.seat_layout_detail_id =
                sld.seat_layout_detail_id
        LEFT JOIN bookings b
            ON b.booking_id = bs.booking_id
            AND b.status IN (
                'PENDING',
                'CONFIRMED'
            )
        LEFT JOIN seat_holds sh
            ON sh.trip_id = t.trip_id
            AND sh.seat_layout_detail_id =
                sld.seat_layout_detail_id
            AND sh.expired_at > NOW()
        WHERE t.trip_id = ?

        ORDER BY
            sld.floor_no ASC,
            sld.row_no ASC,
            sld.column_no ASC
    `;

  return await query<Seat>(sql, [tripId]);
}

export async function findTripSeatMeta(
  tripId: number,
): Promise<TripSeatMeta | null> {
  const sql = `
        SELECT
            t.trip_id AS tripId,
            v.vehicle_name AS vehicleName,
            v.license_plate AS licensePlate,
            sl.floor_count AS floorCount,
            sl.total_seats AS totalSeats
        FROM trips t
        JOIN vehicles v
            ON v.vehicle_id = t.vehicle_id
        JOIN seat_layouts sl
            ON sl.seat_layout_id = v.seat_layout_id
        WHERE t.trip_id = ?

        LIMIT 1
    `;
  const result = await query<TripSeatMeta>(sql, [tripId]);
  return result[0] || null;
}
