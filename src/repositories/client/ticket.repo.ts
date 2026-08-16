import type { PoolConnection, ResultSetHeader } from "mysql2/promise";

import { query, connQuery, connExecute } from "@/lib/server/mysql";
import {
  BookingForAction,
  BookingSeatRow,
  TripForChange,
  SeatAvailabilityRow,
  WalletRow,
} from "@/types/client/ticket/ticket.type";

// ============================================================
// BOOKING
// ============================================================

export async function findBookingForUser(
  userId: number,
  bookingId: number,
): Promise<BookingForAction | null> {
  const sql = `
    SELECT
      b.booking_id AS bookingId,
      b.booking_code AS bookingCode,
      b.user_id AS userId,
      b.trip_id AS tripId,
      b.status AS bookingStatus,
      b.total_amount AS totalAmount,

      b.contact_name AS contactName,
      b.contact_phone AS contactPhone,
      b.contact_email AS contactEmail,

      t.departure_datetime AS departureDatetime,
      t.status AS tripStatus,

      (
        SELECT COUNT(*)
        FROM booking_seats bs
        WHERE bs.booking_id = b.booking_id
      ) AS seatCount,

      p.payment_id AS paymentId,
      p.status AS paymentStatus,
      p.payment_method AS paymentMethod,

      b.created_at AS createdAt

    FROM bookings b

    INNER JOIN trips t
      ON t.trip_id = b.trip_id

    LEFT JOIN payments p
      ON p.payment_id = (
        SELECT pb.payment_id
        FROM payment_bookings pb
        INNER JOIN payments p2
          ON p2.payment_id = pb.payment_id
        WHERE pb.booking_id = b.booking_id
        ORDER BY p2.created_at DESC
        LIMIT 1
      )

    WHERE
      b.booking_id = ?
      AND b.user_id = ?

    LIMIT 1
  `;

  const rows = await query<BookingForAction>(sql, [bookingId, userId]);

  return rows[0] ?? null;
}

// ============================================================
// LOCK BOOKING
// ============================================================

export async function findBookingForUpdate(
  conn: PoolConnection,
  userId: number,
  bookingId: number,
): Promise<BookingForAction | null> {
  const sql = `
    SELECT
      b.booking_id AS bookingId,
      b.booking_code AS bookingCode,
      b.user_id AS userId,
      b.trip_id AS tripId,
      b.status AS bookingStatus,
      b.total_amount AS totalAmount,

      b.contact_name AS contactName,
      b.contact_phone AS contactPhone,
      b.contact_email AS contactEmail,

      t.departure_datetime AS departureDatetime,
      t.status AS tripStatus,

      (
        SELECT COUNT(*)
        FROM booking_seats bs
        WHERE bs.booking_id = b.booking_id
      ) AS seatCount,

      p.payment_id AS paymentId,
      p.status AS paymentStatus,
      p.payment_method AS paymentMethod,

      b.created_at AS createdAt

    FROM bookings b

    INNER JOIN trips t
      ON t.trip_id = b.trip_id

    LEFT JOIN payments p
      ON p.payment_id = (
        SELECT pb.payment_id
        FROM payment_bookings pb
        INNER JOIN payments p2
          ON p2.payment_id = pb.payment_id
        WHERE pb.booking_id = b.booking_id
        ORDER BY p2.created_at DESC
        LIMIT 1
      )

    WHERE
      b.booking_id = ?
      AND b.user_id = ?

    LIMIT 1

    FOR UPDATE
  `;

  const rows = await connQuery<BookingForAction>(conn, sql, [
    bookingId,
    userId,
  ]);

  return rows[0] ?? null;
}

// ============================================================
// BOOKING SEATS
// ============================================================

export async function findBookingSeats(
  conn: PoolConnection | undefined,
  bookingId: number,
): Promise<BookingSeatRow[]> {
  const sql = `
    SELECT
      bs.booking_seat_id AS bookingSeatId,
      bs.seat_layout_detail_id AS seatLayoutDetailId,
      sld.seat_number AS seatNumber,
      bs.seat_price AS seatPrice

    FROM booking_seats bs

    INNER JOIN seat_layout_details sld
      ON sld.seat_layout_detail_id =
         bs.seat_layout_detail_id

    WHERE bs.booking_id = ?

    ORDER BY
      sld.floor_no,
      sld.row_no,
      sld.column_no
  `;

  if (conn) {
    return connQuery<BookingSeatRow>(conn, sql, [bookingId]);
  }

  return query<BookingSeatRow>(sql, [bookingId]);
}

// ============================================================
// TRIP - LOCK
// ============================================================

export async function findTripForUpdate(
  conn: PoolConnection,
  tripId: number,
): Promise<TripForChange | null> {
  const sql = `
    SELECT
      t.trip_id AS tripId,
      t.route_id AS routeId,
      t.vehicle_id AS vehicleId,

      t.departure_datetime AS departureDatetime,
      t.arrival_datetime AS arrivalDatetime,

      t.available_seats AS availableSeats,

      COALESCE(
        t.ticket_price,
        r.base_price,
        0
      ) AS ticketPrice,

      t.status AS status,

      v.seat_layout_id AS seatLayoutId

    FROM trips t

    INNER JOIN routes r
      ON r.route_id = t.route_id

    LEFT JOIN vehicles v
      ON v.vehicle_id = t.vehicle_id

    WHERE t.trip_id = ?

    LIMIT 1

    FOR UPDATE
  `;

  const rows = await connQuery<TripForChange>(conn, sql, [tripId]);

  return rows[0] ?? null;
}

// ============================================================
// TRIP - PREVIEW
// ============================================================

export async function findTripById(
  tripId: number,
): Promise<TripForChange | null> {
  const sql = `
    SELECT
      t.trip_id AS tripId,
      t.route_id AS routeId,
      t.vehicle_id AS vehicleId,

      t.departure_datetime AS departureDatetime,
      t.arrival_datetime AS arrivalDatetime,

      t.available_seats AS availableSeats,

      COALESCE(
        t.ticket_price,
        r.base_price,
        0
      ) AS ticketPrice,

      t.status AS status,

      v.seat_layout_id AS seatLayoutId

    FROM trips t

    INNER JOIN routes r
      ON r.route_id = t.route_id

    LEFT JOIN vehicles v
      ON v.vehicle_id = t.vehicle_id

    WHERE t.trip_id = ?

    LIMIT 1
  `;

  const rows = await query<TripForChange>(sql, [tripId]);

  return rows[0] ?? null;
}

// ============================================================
// CHECK AVAILABLE SEATS
// ============================================================

export async function findAvailableSeatsForUpdate(
  conn: PoolConnection,
  tripId: number,
  seatIds: number[],
): Promise<SeatAvailabilityRow[]> {
  if (seatIds.length === 0) {
    return [];
  }

  const placeholders = seatIds.map(() => "?").join(",");

  const sql = `
    SELECT
      sld.seat_layout_detail_id AS seatLayoutDetailId,
      sld.seat_number AS seatNumber,

      COALESCE(
        t.ticket_price,
        r.base_price,
        0
      ) AS seatPrice,

      t.trip_id AS tripId

    FROM seat_layout_details sld

    INNER JOIN trips t
      ON t.trip_id = ?

    INNER JOIN routes r
      ON r.route_id = t.route_id

    WHERE
      sld.seat_layout_detail_id
      IN (${placeholders})

      AND sld.is_active = TRUE

      AND (
        t.vehicle_id IS NULL

        OR sld.seat_layout_id = (
          SELECT v.seat_layout_id
          FROM vehicles v
          WHERE v.vehicle_id = t.vehicle_id
        )
      )

    FOR UPDATE
  `;

  return connQuery<SeatAvailabilityRow>(conn, sql, [tripId, ...seatIds]);
}

// ============================================================
// CHECK BOOKED SEATS
// ============================================================

export async function findBookedSeatIds(
  conn: PoolConnection,
  tripId: number,
  seatIds: number[],
): Promise<number[]> {
  if (seatIds.length === 0) {
    return [];
  }

  const placeholders = seatIds.map(() => "?").join(",");

  const sql = `
    SELECT
      seat_layout_detail_id AS seatLayoutDetailId

    FROM booking_seats

    WHERE
      trip_id = ?

      AND seat_layout_detail_id
      IN (${placeholders})
  `;

  const rows = await connQuery<{
    seatLayoutDetailId: number;
  }>(conn, sql, [tripId, ...seatIds]);

  return rows.map((row) => row.seatLayoutDetailId);
}

// ============================================================
// CHECK HELD SEATS
// ============================================================

export async function findHeldSeatIds(
  conn: PoolConnection,
  tripId: number,
  seatIds: number[],
): Promise<number[]> {
  if (seatIds.length === 0) {
    return [];
  }

  const placeholders = seatIds.map(() => "?").join(",");

  const sql = `
    SELECT
      seat_layout_detail_id AS seatLayoutDetailId

    FROM seat_holds

    WHERE
      trip_id = ?

      AND seat_layout_detail_id
      IN (${placeholders})

      AND expired_at > NOW()
  `;

  const rows = await connQuery<{
    seatLayoutDetailId: number;
  }>(conn, sql, [tripId, ...seatIds]);

  return rows.map((row) => row.seatLayoutDetailId);
}

// ============================================================
// CANCEL BOOKING
// ============================================================

export async function cancelBooking(
  conn: PoolConnection,
  bookingId: number,
  cancelReason: string,
): Promise<ResultSetHeader> {
  return connExecute(
    conn,
    `
      UPDATE bookings

      SET
        status = 'CANCELLED',
        cancel_reason = ?,
        updated_at = CURRENT_TIMESTAMP

      WHERE
        booking_id = ?
        AND status = 'CONFIRMED'
    `,
    [cancelReason, bookingId],
  );
}

// ============================================================
// DELETE BOOKING SEATS
// ============================================================

export async function deleteBookingSeats(
  conn: PoolConnection,
  bookingId: number,
): Promise<ResultSetHeader> {
  return connExecute(
    conn,
    `
      DELETE FROM booking_seats
      WHERE booking_id = ?
    `,
    [bookingId],
  );
}

// Alias dùng cho change ticket
export async function deleteBookingSeatsByBooking(
  conn: PoolConnection,
  bookingId: number,
): Promise<ResultSetHeader> {
  return deleteBookingSeats(conn, bookingId);
}

// ============================================================
// DELETE HOLDS
// ============================================================

export async function deleteSeatHoldsByBooking(
  conn: PoolConnection,
  bookingId: number,
): Promise<ResultSetHeader> {
  return connExecute(
    conn,
    `
      DELETE FROM seat_holds
      WHERE booking_id = ?
    `,
    [bookingId],
  );
}

// ============================================================
// INCREASE TRIP AVAILABLE SEATS
// ============================================================

export async function increaseTripAvailableSeats(
  conn: PoolConnection,
  tripId: number,
  seatCount: number,
): Promise<ResultSetHeader> {
  return connExecute(
    conn,
    `
      UPDATE trips

      SET
        available_seats =
          available_seats + ?

      WHERE trip_id = ?
    `,
    [seatCount, tripId],
  );
}

// ============================================================
// DECREASE TRIP AVAILABLE SEATS
// ============================================================

export async function decreaseTripAvailableSeats(
  conn: PoolConnection,
  tripId: number,
  seatCount: number,
): Promise<ResultSetHeader> {
  return connExecute(
    conn,
    `
      UPDATE trips

      SET
        available_seats =
          available_seats - ?

      WHERE
        trip_id = ?
        AND available_seats >= ?
    `,
    [seatCount, tripId, seatCount],
  );
}

// ============================================================
// WALLET
// ============================================================

export async function findWalletForUpdate(
  conn: PoolConnection,
  userId: number,
): Promise<WalletRow | null> {
  const rows = await connQuery<WalletRow>(
    conn,
    `
      SELECT
        wallet_id AS walletId,
        user_id AS userId,
        balance,
        status

      FROM wallets

      WHERE user_id = ?

      LIMIT 1

      FOR UPDATE
    `,
    [userId],
  );

  return rows[0] ?? null;
}

// ============================================================
// REFUND WALLET
// ============================================================

export async function refundToWallet(
  conn: PoolConnection,
  walletId: number,
  bookingId: number,
  amount: number,
  description: string,
): Promise<void> {
  const walletRows = await connQuery<{
    balance: number | string;
  }>(
    conn,
    `
      SELECT balance
      FROM wallets
      WHERE wallet_id = ?
      FOR UPDATE
    `,
    [walletId],
  );

  const wallet = walletRows[0];

  if (!wallet) {
    throw new Error("WALLET_NOT_FOUND");
  }

  const balanceBefore = Number(wallet.balance);

  const balanceAfter = balanceBefore + amount;

  await connExecute(
    conn,
    `
      UPDATE wallets

      SET
        balance = ?,
        updated_at = CURRENT_TIMESTAMP

      WHERE wallet_id = ?
    `,
    [balanceAfter, walletId],
  );

  await connExecute(
    conn,
    `
      INSERT INTO wallet_transactions (
        wallet_id,
        payment_id,
        booking_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        reference_code,
        description
      )

      VALUES (
        ?,
        NULL,
        ?,
        'REFUND',
        ?,
        ?,
        ?,
        ?,
        ?
      )
    `,
    [
      walletId,
      bookingId,
      amount,
      balanceBefore,
      balanceAfter,
      `REFUND-${bookingId}-${Date.now()}`,
      description,
    ],
  );
}

// ============================================================
// PAYMENT
// ============================================================

export async function markPaymentRefunded(
  conn: PoolConnection,
  paymentId: number,
  manualNote: string,
): Promise<ResultSetHeader> {
  return connExecute(
    conn,
    `
      UPDATE payments

      SET
        status = 'REFUNDED',
        manual_note = ?,
        updated_at = CURRENT_TIMESTAMP

      WHERE payment_id = ?
    `,
    [manualNote, paymentId],
  );
}

// ============================================================
// NOTIFICATION
// ============================================================

export async function createNotification(
  conn: PoolConnection,
  userId: number,
  title: string,
  content: string,
  type: "BOOKING" | "PAYMENT" | "CHECKIN" | "SYSTEM",
): Promise<ResultSetHeader> {
  return connExecute(
    conn,
    `
      INSERT INTO notifications (
        user_id,
        title,
        content,
        notification_type
      )

      VALUES (?, ?, ?, ?)
    `,
    [userId, title, content, type],
  );
}

// ============================================================
// CHANGE BOOKING
// ============================================================

export async function updateBookingTrip(
  conn: PoolConnection,
  bookingId: number,
  tripId: number,
  totalAmount: number,
  seatPrice: number,
): Promise<ResultSetHeader> {
  return connExecute(
    conn,
    `
      UPDATE bookings

      SET
        trip_id = ?,
        total_amount = ?,
        seat_price = ?,
        updated_at = CURRENT_TIMESTAMP

      WHERE booking_id = ?
    `,
    [tripId, totalAmount, seatPrice, bookingId],
  );
}

// ============================================================
// INSERT BOOKING SEAT
// ============================================================

export async function insertBookingSeat(
  conn: PoolConnection,
  bookingId: number,
  tripId: number,
  seatLayoutDetailId: number,
  seatPrice: number,
): Promise<ResultSetHeader> {
  return connExecute(
    conn,
    `
      INSERT INTO booking_seats (
        booking_id,
        trip_id,
        seat_layout_detail_id,
        seat_price
      )

      VALUES (?, ?, ?, ?)
    `,
    [bookingId, tripId, seatLayoutDetailId, seatPrice],
  );
}
export async function getChangeBookingForUpdate(
  conn: PoolConnection,
  userId: number,
  bookingId: number,
): Promise<BookingForAction | null> {
  const sql = `
    SELECT
      b.booking_id AS bookingId,
      b.booking_code AS bookingCode,
      b.user_id AS userId,
      b.trip_id AS tripId,
      b.booking_status AS bookingStatus,
      b.total_amount AS totalAmount,
      b.contact_name AS contactName,
      b.contact_phone AS contactPhone,
      b.contact_email AS contactEmail,
      b.payment_id AS paymentId,
      p.payment_status AS paymentStatus,
      p.payment_method AS paymentMethod,
      t.departure_datetime AS departureDatetime,
      t.status AS tripStatus,

      (
        SELECT COUNT(*)
        FROM booking_seats bs2
        WHERE bs2.booking_id = b.booking_id
      ) AS seatCount,

      b.created_at AS createdAt

    FROM bookings b

    LEFT JOIN payments p
      ON p.payment_id = b.payment_id

    INNER JOIN trips t
      ON t.trip_id = b.trip_id

    WHERE
      b.booking_id = ?
      AND b.user_id = ?

    FOR UPDATE
  `;

  const rows = await connQuery<BookingForAction>(conn, sql, [
    bookingId,
    userId,
  ]);

  return rows[0] ?? null;
}
export async function getChangeOldTripForUpdate(
  conn: PoolConnection,
  tripId: number,
): Promise<TripForChange | null> {
  const sql = `
    SELECT
      t.trip_id AS tripId,
      t.route_id AS routeId,
      t.vehicle_id AS vehicleId,
      t.departure_datetime AS departureDatetime,
      t.arrival_datetime AS arrivalDatetime,
      t.available_seats AS availableSeats,
      t.ticket_price AS ticketPrice,
      t.status AS status,
      v.seat_layout_id AS seatLayoutId

    FROM trips t

    LEFT JOIN vehicles v
      ON v.vehicle_id = t.vehicle_id

    WHERE t.trip_id = ?

    FOR UPDATE
  `;

  const rows = await connQuery<TripForChange>(conn, sql, [tripId]);

  return rows[0] ?? null;
}
export async function getChangeNewTripForUpdate(
  conn: PoolConnection,
  tripId: number,
): Promise<TripForChange | null> {
  const sql = `
    SELECT
      t.trip_id AS tripId,
      t.route_id AS routeId,
      t.vehicle_id AS vehicleId,
      t.departure_datetime AS departureDatetime,
      t.arrival_datetime AS arrivalDatetime,
      t.available_seats AS availableSeats,
      t.ticket_price AS ticketPrice,
      t.status AS status,
      v.seat_layout_id AS seatLayoutId

    FROM trips t

    LEFT JOIN vehicles v
      ON v.vehicle_id = t.vehicle_id

    WHERE t.trip_id = ?

    FOR UPDATE
  `;

  const rows = await connQuery<TripForChange>(conn, sql, [tripId]);

  return rows[0] ?? null;
}
export async function getChangeBookingSeats(
  conn: PoolConnection,
  bookingId: number,
): Promise<BookingSeatRow[]> {
  const sql = `
    SELECT
      bs.booking_seat_id AS bookingSeatId,
      bs.seat_layout_detail_id AS seatLayoutDetailId,
      sld.seat_number AS seatNumber,
      bs.seat_price AS seatPrice

    FROM booking_seats bs

    INNER JOIN seat_layout_details sld
      ON sld.seat_layout_detail_id =
         bs.seat_layout_detail_id

    WHERE bs.booking_id = ?

    FOR UPDATE
  `;

  return connQuery<BookingSeatRow>(conn, sql, [bookingId]);
}
export async function getChangeAvailableSeats(
  conn: PoolConnection,
  tripId: number,
  seatIds: number[],
): Promise<SeatAvailabilityRow[]> {
  if (seatIds.length === 0) {
    return [];
  }

  const placeholders = seatIds.map(() => "?").join(", ");

  const sql = `
    SELECT
      sld.seat_layout_detail_id
        AS seatLayoutDetailId,

      sld.seat_number
        AS seatNumber,

      COALESCE(
        sld.seat_price,
        t.ticket_price
      ) AS seatPrice,

      t.trip_id AS tripId

    FROM trips t

    INNER JOIN vehicles v
      ON v.vehicle_id = t.vehicle_id

    INNER JOIN seat_layout_details sld
      ON sld.seat_layout_id =
         v.seat_layout_id

    WHERE
      t.trip_id = ?
      AND sld.seat_layout_detail_id
          IN (${placeholders})
      AND sld.is_active = 1

    FOR UPDATE
  `;

  return connQuery<SeatAvailabilityRow>(conn, sql, [tripId, ...seatIds]);
}
export async function getChangeBookedSeatIds(
  conn: PoolConnection,
  tripId: number,
  seatIds: number[],
): Promise<number[]> {
  if (seatIds.length === 0) {
    return [];
  }

  const placeholders = seatIds.map(() => "?").join(", ");

  const sql = `
    SELECT
      bs.seat_layout_detail_id
        AS seatLayoutDetailId

    FROM booking_seats bs

    INNER JOIN bookings b
      ON b.booking_id = bs.booking_id

    WHERE
      bs.trip_id = ?
      AND bs.seat_layout_detail_id
          IN (${placeholders})
      AND b.booking_status IN (
        'PENDING',
        'CONFIRMED'
      )

    FOR UPDATE
  `;

  const rows = await connQuery<{
    seatLayoutDetailId: number;
  }>(conn, sql, [tripId, ...seatIds]);

  return rows.map((row) => row.seatLayoutDetailId);
}
export async function getChangeHeldSeatIds(
  conn: PoolConnection,
  tripId: number,
  seatIds: number[],
): Promise<number[]> {
  if (seatIds.length === 0) {
    return [];
  }

  const placeholders = seatIds.map(() => "?").join(", ");

  const sql = `
    SELECT
      seat_layout_detail_id
        AS seatLayoutDetailId

    FROM seat_holds

    WHERE
      trip_id = ?
      AND seat_layout_detail_id
          IN (${placeholders})
      AND expired_at > NOW()

    FOR UPDATE
  `;

  const rows = await connQuery<{
    seatLayoutDetailId: number;
  }>(conn, sql, [tripId, ...seatIds]);

  return rows.map((row) => row.seatLayoutDetailId);
}
export async function removeChangeOldBookingSeats(
  conn: PoolConnection,
  bookingId: number,
): Promise<ResultSetHeader> {
  const sql = `
    DELETE FROM booking_seats
    WHERE booking_id = ?
  `;

  return connExecute(conn, sql, [bookingId]);
}
export async function removeChangeOldSeatHolds(
  conn: PoolConnection,
  bookingId: number,
): Promise<ResultSetHeader> {
  const sql = `
    DELETE FROM seat_holds
    WHERE booking_id = ?
  `;

  return connExecute(conn, sql, [bookingId]);
}
export async function restoreChangeOldTripSeats(
  conn: PoolConnection,
  tripId: number,
  seatCount: number,
): Promise<ResultSetHeader> {
  const sql = `
    UPDATE trips
    SET
      available_seats =
        available_seats + ?
    WHERE trip_id = ?
  `;

  return connExecute(conn, sql, [seatCount, tripId]);
}
export async function reserveChangeNewTripSeats(
  conn: PoolConnection,
  tripId: number,
  seatCount: number,
): Promise<ResultSetHeader> {
  const sql = `
    UPDATE trips
    SET
      available_seats =
        available_seats - ?
    WHERE
      trip_id = ?
      AND available_seats >= ?
  `;

  return connExecute(conn, sql, [seatCount, tripId, seatCount]);
}
export async function addChangeBookingSeat(
  conn: PoolConnection,
  bookingId: number,
  tripId: number,
  seatLayoutDetailId: number,
  seatPrice: number,
): Promise<ResultSetHeader> {
  const sql = `
    INSERT INTO booking_seats (
      booking_id,
      trip_id,
      seat_layout_detail_id,
      seat_price
    )
    VALUES (?, ?, ?, ?)
  `;

  return connExecute(conn, sql, [
    bookingId,
    tripId,
    seatLayoutDetailId,
    seatPrice,
  ]);
}
export async function updateBookingForChange(
  conn: PoolConnection,
  bookingId: number,
  newTripId: number,
  newTotalAmount: number,
): Promise<ResultSetHeader> {
  const sql = `
    UPDATE bookings
    SET
      trip_id = ?,
      total_amount = ?,
      updated_at = NOW()
    WHERE booking_id = ?
  `;

  return connExecute(conn, sql, [newTripId, newTotalAmount, bookingId]);
}
export async function getChangeWalletForUpdate(
  conn: PoolConnection,
  userId: number,
): Promise<WalletRow | null> {
  const sql = `
    SELECT
      wallet_id AS walletId,
      user_id AS userId,
      balance,
      status

    FROM wallets

    WHERE user_id = ?

    FOR UPDATE
  `;

  const rows = await connQuery<WalletRow>(conn, sql, [userId]);

  return rows[0] ?? null;
}
export async function addChangeRefundToWallet(
  conn: PoolConnection,
  walletId: number,
  bookingId: number,
  refundAmount: number,
  description: string,
): Promise<void> {
  await connExecute(
    conn,
    `
      UPDATE wallets
      SET
        balance = balance + ?,
        updated_at = NOW()
      WHERE wallet_id = ?
    `,
    [refundAmount, walletId],
  );

  await connExecute(
    conn,
    `
      INSERT INTO wallet_transactions (
        wallet_id,
        booking_id,
        transaction_type,
        amount,
        description,
        created_at
      )
      VALUES (?, ?, 'REFUND', ?, ?, NOW())
    `,
    [walletId, bookingId, refundAmount, description],
  );
}
export async function createChangeNotification(
  conn: PoolConnection,
  userId: number,
  title: string,
  content: string,
  type: string,
): Promise<ResultSetHeader> {
  const sql = `
    INSERT INTO notifications (
      user_id,
      title,
      content,
      type,
      created_at
    )
    VALUES (?, ?, ?, ?, NOW())
  `;

  return connExecute(conn, sql, [userId, title, content, type]);
}
export async function getChangeBookingForPreview(
  userId: number,
  bookingId: number,
): Promise<BookingForAction | null> {
  const sql = `
    SELECT
      b.booking_id AS bookingId,
      b.booking_code AS bookingCode,
      b.user_id AS userId,
      b.trip_id AS tripId,
      b.booking_status AS bookingStatus,
      b.total_amount AS totalAmount,

      b.contact_name AS contactName,
      b.contact_phone AS contactPhone,
      b.contact_email AS contactEmail,

      b.payment_id AS paymentId,

      p.payment_status AS paymentStatus,
      p.payment_method AS paymentMethod,

      t.departure_datetime AS departureDatetime,
      t.status AS tripStatus,

      (
        SELECT COUNT(*)
        FROM booking_seats bs
        WHERE bs.booking_id = b.booking_id
      ) AS seatCount,

      b.created_at AS createdAt

    FROM bookings b

    INNER JOIN trips t
      ON t.trip_id = b.trip_id

    LEFT JOIN payments p
      ON p.payment_id = b.payment_id

    WHERE
      b.booking_id = ?
      AND b.user_id = ?

    LIMIT 1
  `;

  const rows = await query<BookingForAction>(sql, [bookingId, userId]);

  return rows[0] ?? null;
}
export async function getChangeTripByIdForPreview(
  tripId: number,
): Promise<TripForChange | null> {
  const sql = `
    SELECT
      t.trip_id AS tripId,
      t.route_id AS routeId,
      t.vehicle_id AS vehicleId,

      t.departure_datetime
        AS departureDatetime,

      t.arrival_datetime
        AS arrivalDatetime,

      t.available_seats
        AS availableSeats,

      t.ticket_price
        AS ticketPrice,

      t.status AS status,

      v.seat_layout_id
        AS seatLayoutId

    FROM trips t

    LEFT JOIN vehicles v
      ON v.vehicle_id = t.vehicle_id

    WHERE t.trip_id = ?

    LIMIT 1
  `;

  const rows = await query<TripForChange>(sql, [tripId]);

  return rows[0] ?? null;
}
export async function getChangeBookingSeatsForPreview(
  bookingId: number,
): Promise<BookingSeatRow[]> {
  const sql = `
    SELECT
      bs.booking_seat_id
        AS bookingSeatId,

      bs.seat_layout_detail_id
        AS seatLayoutDetailId,

      sld.seat_number
        AS seatNumber,

      bs.seat_price
        AS seatPrice

    FROM booking_seats bs

    INNER JOIN seat_layout_details sld
      ON sld.seat_layout_detail_id =
         bs.seat_layout_detail_id

    WHERE bs.booking_id = ?

    ORDER BY bs.booking_seat_id
  `;

  return query<BookingSeatRow>(sql, [bookingId]);
}
export async function getChangeAvailableSeatsForPreview(
  tripId: number,
  seatIds: number[],
): Promise<SeatAvailabilityRow[]> {
  if (seatIds.length === 0) {
    return [];
  }

  const placeholders = seatIds.map(() => "?").join(",");

  const sql = `
    SELECT
      sld.seat_layout_detail_id
        AS seatLayoutDetailId,

      sld.seat_number
        AS seatNumber,

      COALESCE(
        t.ticket_price,
        r.base_price,
        0
      ) AS seatPrice,

      t.trip_id AS tripId

    FROM seat_layout_details sld

    INNER JOIN trips t
      ON t.trip_id = ?

    INNER JOIN routes r
      ON r.route_id = t.route_id

    WHERE
      sld.seat_layout_detail_id
        IN (${placeholders})

      AND sld.is_active = TRUE

      AND (
        t.vehicle_id IS NULL

        OR sld.seat_layout_id = (
          SELECT v.seat_layout_id
          FROM vehicles v
          WHERE v.vehicle_id = t.vehicle_id
        )
      )
  `;

  return query<SeatAvailabilityRow>(sql, [tripId, ...seatIds]);
}
export async function getChangeBookedSeatsForPreview(
  tripId: number,
  seatIds: number[],
): Promise<
  {
    seatLayoutDetailId: number;
  }[]
> {
  if (seatIds.length === 0) {
    return [];
  }

  const placeholders = seatIds.map(() => "?").join(",");

  const sql = `
    SELECT
      seat_layout_detail_id
        AS seatLayoutDetailId

    FROM booking_seats

    WHERE
      trip_id = ?

      AND seat_layout_detail_id
        IN (${placeholders})
  `;

  return query<{
    seatLayoutDetailId: number;
  }>(sql, [tripId, ...seatIds]);
}
export async function getChangeHeldSeatsForPreview(
  tripId: number,
  seatIds: number[],
): Promise<
  {
    seatLayoutDetailId: number;
  }[]
> {
  if (seatIds.length === 0) {
    return [];
  }

  const placeholders = seatIds.map(() => "?").join(",");

  const sql = `
    SELECT
      seat_layout_detail_id
        AS seatLayoutDetailId

    FROM seat_holds

    WHERE
      trip_id = ?

      AND seat_layout_detail_id
        IN (${placeholders})

      AND expired_at > NOW()
  `;

  return query<{
    seatLayoutDetailId: number;
  }>(sql, [tripId, ...seatIds]);
}
