import mysql from "mysql2/promise";

export async function createShuttleRequest(
  conn: mysql.PoolConnection,
  payload: {
    bookingId: number;
    type: "PICKUP" | "DROPOFF";
    address: string;
    latitude?: number;
    longitude?: number;
  },
) {
  await conn.execute(
    `
      INSERT INTO booking_shuttle_requests
      (
        booking_id,
        type,
        address,
        latitude,
        longitude
      )
      VALUES (?, ?, ?, ?, ?)
    `,
    [
      payload.bookingId,
      payload.type,
      payload.address,
      payload.latitude ?? null,
      payload.longitude ?? null,
    ],
  );
}
