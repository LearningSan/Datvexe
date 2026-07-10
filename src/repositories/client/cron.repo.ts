import mysql from "mysql2/promise";

import { connQuery } from "@/lib/server/mysql";

export async function findExpiredSeatHoldsGrouped(conn: mysql.PoolConnection) {
  return connQuery<{
    trip_id: number;
    count: number;
  }>(
    conn,
    `
    SELECT
      trip_id,
      COUNT(*) AS count
    FROM seat_holds
    WHERE expired_at <= NOW()
    GROUP BY trip_id
    `,
  );
}

export async function restoreTripSeats(
  conn: mysql.PoolConnection,
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

export async function deleteExpiredSeatHolds(conn: mysql.PoolConnection) {
  await connQuery(
    conn,
    `
    DELETE FROM seat_holds
    WHERE expired_at <= NOW()
    `,
  );
}
