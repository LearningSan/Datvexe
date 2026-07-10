import { query, connQuery } from "@/lib/server/mysql";
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
