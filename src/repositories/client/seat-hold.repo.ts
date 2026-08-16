import { query, connQuery, PoolConnection } from "@/lib/server/mysql";
import mysql from "mysql2/promise";
export async function checkSeatsHeldBySession(
  conn: mysql.PoolConnection,
  tripId: number,
  seatIds: number[],
  sessionId: string,
) {
  if (seatIds.length === 0) {
    return [];
  }

  const placeholders = seatIds.map(() => "?").join(",");

  return connQuery(
    conn,
    `
    SELECT seat_layout_detail_id
    FROM seat_holds
    WHERE trip_id = ?
      AND seat_layout_detail_id IN (${placeholders})
      AND session_id = ?
      AND expired_at > NOW()
    `,
    [tripId, ...seatIds, sessionId],
  );
}

export async function checkSeatsNotHeld(
  conn: mysql.PoolConnection,
  tripId: number,
  seatIds: number[],
  sessionId: string,
) {
  if (seatIds.length === 0) {
    return [];
  }

  const placeholders = seatIds.map(() => "?").join(",");

  return connQuery(
    conn,
    `
    SELECT seat_layout_detail_id
    FROM seat_holds
    WHERE trip_id = ?
      AND seat_layout_detail_id IN (${placeholders})
      AND session_id != ?
      AND expired_at > NOW()
    `,
    [tripId, ...seatIds, sessionId],
  );
}
export async function findExpiredSeatHolds(conn: PoolConnection) {
  return await connQuery<{
    seat_hold_id: number;
    trip_id: number;
    seat_layout_detail_id: number;
  }>(
    conn,
    `
      SELECT
        seat_hold_id,
        trip_id,
        seat_layout_detail_id
      FROM seat_holds
      WHERE expired_at <= NOW()
      FOR UPDATE
    `,
  );
}

export async function deleteSeatHoldsByIds(
  conn: PoolConnection,
  holdIds: number[],
) {
  if (holdIds.length === 0) {
    return;
  }

  const placeholders = holdIds.map(() => "?").join(",");

  await connQuery(
    conn,
    `
      DELETE FROM seat_holds
      WHERE seat_hold_id IN (${placeholders})
    `,
    holdIds,
  );
}

export async function updateTripAvailableSeats(
  conn: PoolConnection,
  tripId: number,
  count: number,
) {
  await connQuery(
    conn,
    `
      UPDATE trips
      SET available_seats = available_seats + ?
      WHERE trip_id = ?
    `,
    [count, tripId],
  );
}
