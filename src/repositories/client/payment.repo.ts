import type mysql from "mysql2/promise";
import { query, connQuery } from "@/lib/server/mysql";

import type {
  PaymentMethodType,
  PaymentStatus,
  BookingStatus,
  BookingPaymentSummaryRow,
  PaymentFlowType,
} from "@/types/client/payment/payment.type";

export async function findBookingPaymentSummaryRaw(bookingId: number) {
  const rows = await query<BookingPaymentSummaryRow>(
    `
    SELECT
      b.booking_id AS bookingId,
      b.booking_code AS bookingCode,
      b.trip_id AS tripId,

      COALESCE(vt.type_name, 'Chưa cập nhật') AS vehicleTypeName,
      COALESCE(oc.city_name, 'Chưa cập nhật') AS originCity,
      COALESCE(dc.city_name, 'Chưa cập nhật') AS destinationCity,

      v.vehicle_name AS vehicleName,
      v.license_plate AS licensePlate,

      t.departure_datetime AS departureDatetime,
      t.arrival_datetime AS arrivalDatetime,
      t.status AS tripStatus,
      t.ticket_price AS tripTicketPrice,

      b.contact_name AS passengerName,
      b.contact_phone AS passengerPhone,
      b.contact_email AS passengerEmail,

      pp.point_name AS pickupPointName,
      pp.address AS pickupPointAddress,

      dp.point_name AS dropoffPointName,
      dp.address AS dropoffPointAddress,

      b.seat_price AS seatPrice,
      b.total_amount AS totalAmount,
      b.booking_type AS bookingType,
      b.pickup_method AS pickupMethod,
      b.dropoff_method AS dropoffMethod,
      b.created_at AS createdAt,
      b.cancel_reason AS cancelReason,
      b.hold_expired_at AS holdExpiredAt,
      b.status AS bookingStatus,

      p.payment_method AS paymentMethod,
      p.status AS paymentStatus,
      p.transaction_code AS transactionCode,
      p.paid_at AS paidAt,

      COALESCE(SUM(DISTINCT bp.discount_amount), 0) AS discountAmount,

      GROUP_CONCAT(DISTINCT sld.seat_number ORDER BY sld.seat_number SEPARATOR ',') AS seatNumbersRaw,
      COUNT(DISTINCT COALESCE(bs.seat_layout_detail_id, sh.seat_layout_detail_id)) AS seatCount

    FROM bookings b

    LEFT JOIN trips t ON t.trip_id = b.trip_id
    LEFT JOIN routes r ON r.route_id = t.route_id
    LEFT JOIN cities oc ON oc.city_id = r.origin_city_id
    LEFT JOIN cities dc ON dc.city_id = r.destination_city_id
    LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
    LEFT JOIN vehicle_types vt ON vt.vehicle_type_id = v.vehicle_type_id

    LEFT JOIN pickup_points pp ON pp.pickup_point_id = b.pickup_point_id
    LEFT JOIN pickup_points dp ON dp.pickup_point_id = b.dropoff_point_id

    LEFT JOIN booking_promotions bp ON bp.booking_id = b.booking_id

    LEFT JOIN booking_seats bs ON bs.booking_id = b.booking_id
    LEFT JOIN seat_holds sh ON sh.booking_id = b.booking_id AND sh.expired_at > NOW()

    LEFT JOIN seat_layout_details sld
      ON sld.seat_layout_detail_id = COALESCE(bs.seat_layout_detail_id, sh.seat_layout_detail_id)

    LEFT JOIN payments p
      ON p.payment_id = (
        SELECT p2.payment_id
        FROM payments p2
        WHERE p2.booking_id = b.booking_id
        ORDER BY p2.created_at DESC
        LIMIT 1
      )

    WHERE b.booking_id = ?

    GROUP BY
      b.booking_id,
      b.booking_code,
      b.trip_id,
      vt.type_name,
      v.vehicle_name,
      v.license_plate,
      oc.city_name,
      dc.city_name,
      t.departure_datetime,
      t.arrival_datetime,
      t.status,
      t.ticket_price,
      b.contact_name,
      b.contact_phone,
      b.contact_email,
      pp.point_name,
      pp.address,
      dp.point_name,
      dp.address,
      b.seat_price,
      b.total_amount,
      b.booking_type,
      b.pickup_method,
      b.dropoff_method,
      b.created_at,
      b.cancel_reason,
      b.hold_expired_at,
      b.status,
      p.payment_method,
      p.status,
      p.transaction_code,
      p.paid_at

    LIMIT 1
    `,
    [bookingId],
  );

  return rows[0] || null;
}

export async function findBookingForPayment(
  conn: mysql.PoolConnection,
  bookingId: number,
) {
  const rows = await connQuery<{
    bookingId: number;
    bookingCode: string;
    tripId: number;
    amount: string | number;
    status: BookingStatus;
    holdExpiredAt: string | null;
  }>(
    conn,
    `
    SELECT
      booking_id AS bookingId,
      booking_code AS bookingCode,
      trip_id AS tripId,
      total_amount AS amount,
      status,
      hold_expired_at AS holdExpiredAt
    FROM bookings
    WHERE booking_id = ?
    LIMIT 1
    `,
    [bookingId],
  );

  return rows[0] || null;
}

export async function findPendingPaymentByBooking(
  conn: mysql.PoolConnection,
  bookingId: number,
) {
  const rows = await connQuery<{
    paymentId: number;
    bookingId: number;
    paymentMethod: PaymentMethodType;
    amount: string | number;
    status: PaymentStatus;
    transactionCode: string;
  }>(
    conn,
    `
    SELECT
      payment_id AS paymentId,
      booking_id AS bookingId,
      payment_method AS paymentMethod,
      amount,
      status,
      transaction_code AS transactionCode
    FROM payments
    WHERE booking_id = ?
      AND status IN ('PENDING', 'PROCESSING', 'WAITING_CONFIRM', 'REJECTED', 'FAILED')
    ORDER BY payment_id DESC
    LIMIT 1
    `,
    [bookingId],
  );

  return rows[0] ?? null;
}

export async function insertPayment(
  conn: mysql.PoolConnection,
  data: {
    bookingId: number;
    paymentMethod: PaymentMethodType;
    amount: number;
    transactionCode: string;
    flowType: PaymentFlowType;
    provider: string;
    gatewayResponse?: unknown;
  },
) {
  const result: any = await connQuery(
    conn,
    `
    INSERT INTO payments (
      booking_id,
      payment_method,
      amount,
      status,
      transaction_code,
      flow_type,
      provider,
      gateway_response,
      created_at
    )
    VALUES (?, ?, ?, 'PENDING', ?, ?, ?, ?, NOW())
    `,
    [
      data.bookingId,
      data.paymentMethod,
      data.amount,
      data.transactionCode,
      data.flowType,
      data.provider,
      JSON.stringify(data.gatewayResponse ?? {}),
    ],
  );

  return Number(result.insertId);
}

export async function updatePendingPaymentForNewAttempt(
  conn: mysql.PoolConnection,
  data: {
    paymentId: number;
    paymentMethod: PaymentMethodType;
    transactionCode: string;
    flowType: PaymentFlowType;
    provider: string;
  },
) {
  await connQuery(
    conn,
    `
    UPDATE payments
    SET
      payment_method = ?,
      transaction_code = ?,
      flow_type = ?,
      provider = ?,
      status = 'PENDING',
      provider_order_code = NULL,
      payment_url = NULL,
      qr_code_url = NULL,
      deeplink = NULL,
      return_url = NULL,
      cancel_url = NULL,
      manual_note = NULL,
      failed_reason = NULL
    WHERE payment_id = ?
      AND status IN ('PENDING', 'PROCESSING', 'WAITING_CONFIRM', 'FAILED', 'REJECTED')
    `,
    [
      data.paymentMethod,
      data.transactionCode,
      data.flowType,
      data.provider,
      data.paymentId,
    ],
  );
}

export async function updatePaymentGatewayData(
  conn: mysql.PoolConnection,
  data: {
    paymentId: number;
    providerOrderCode?: string | null;
    paymentUrl?: string | null;
    qrCodeUrl?: string | null;
    deeplink?: string | null;
    returnUrl?: string | null;
    cancelUrl?: string | null;
    gatewayResponse?: unknown;
  },
) {
  await connQuery(
    conn,
    `
    UPDATE payments
    SET
      provider_order_code = ?,
      payment_url = ?,
      qr_code_url = ?,
      deeplink = ?,
      return_url = ?,
      cancel_url = ?,
      gateway_response = ?
    WHERE payment_id = ?
    `,
    [
      data.providerOrderCode ?? null,
      data.paymentUrl ?? null,
      data.qrCodeUrl ?? null,
      data.deeplink ?? null,
      data.returnUrl ?? null,
      data.cancelUrl ?? null,
      JSON.stringify(data.gatewayResponse ?? {}),
      data.paymentId,
    ],
  );
}

export async function findPaymentStatusById(paymentId: number) {
  const rows = await query<{
    paymentId: number;
    bookingId: number;
    status: PaymentStatus;
    paymentMethod: PaymentMethodType;
  }>(
    `
    SELECT
      payment_id AS paymentId,
      booking_id AS bookingId,
      status,
      payment_method AS paymentMethod
    FROM payments
    WHERE payment_id = ?
    LIMIT 1
    `,
    [paymentId],
  );

  return rows[0] || null;
}

export async function markPaymentWaitingConfirm(
  paymentId: number,
  note: string | null,
) {
  await query(
    `
    UPDATE payments
    SET
      status = 'WAITING_CONFIRM',
      manual_note = ?
    WHERE payment_id = ?
      AND status = 'PENDING'
      AND flow_type IN ('MANUAL', 'QR', 'CASH')
    `,
    [note, paymentId],
  );
}
export async function findOrCreateWalletForUpdate(
  conn: mysql.PoolConnection,
  userId: number,
) {
  await connQuery(
    conn,
    `
    INSERT INTO wallets (user_id, balance, status)
    VALUES (?, 0, 'ACTIVE')
    ON DUPLICATE KEY UPDATE user_id = user_id
    `,
    [userId],
  );

  const rows = await connQuery<{
    walletId: number;
    userId: number;
    balance: string | number;
    status: "ACTIVE" | "LOCKED";
  }>(
    conn,
    `
    SELECT
      wallet_id AS walletId,
      user_id AS userId,
      balance,
      status
    FROM wallets
    WHERE user_id = ?
    FOR UPDATE
    `,
    [userId],
  );

  return rows[0] ?? null;
}

export async function findBookingUserIdForWallet(
  conn: mysql.PoolConnection,
  bookingId: number,
) {
  const rows = await connQuery<{
    userId: number | null;
  }>(
    conn,
    `
    SELECT user_id AS userId
    FROM bookings
    WHERE booking_id = ?
    LIMIT 1
    `,
    [bookingId],
  );

  return rows[0] ?? null;
}

export async function deductWalletBalance(
  conn: mysql.PoolConnection,
  data: {
    walletId: number;
    amount: number;
  },
) {
  await connQuery(
    conn,
    `
    UPDATE wallets
    SET balance = balance - ?
    WHERE wallet_id = ?
    `,
    [data.amount, data.walletId],
  );
}

export async function insertWalletTransaction(
  conn: mysql.PoolConnection,
  data: {
    walletId: number;
    paymentId: number | null;
    bookingId: number | null;
    transactionType: "DEPOSIT" | "PAYMENT" | "REFUND" | "ADJUSTMENT";
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    description: string | null;
    createdBy: number | null;
  },
) {
  await connQuery(
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
      description,
      created_by,
      created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [
      data.walletId,
      data.paymentId,
      data.bookingId,
      data.transactionType,
      data.amount,
      data.balanceBefore,
      data.balanceAfter,
      data.description,
      data.createdBy,
    ],
  );
}

export async function markPaymentPaidByWallet(
  conn: mysql.PoolConnection,
  paymentId: number,
) {
  await connQuery(
    conn,
    `
    UPDATE payments
    SET
      status = 'PAID',
      paid_at = NOW(),
      confirmed_at = NOW(),
      gateway_response = JSON_OBJECT('provider', 'INTERNAL_WALLET')
    WHERE payment_id = ?
      AND status = 'PENDING'
    `,
    [paymentId],
  );
}

export async function confirmBookingAfterPayment(
  conn: mysql.PoolConnection,
  bookingId: number,
) {
  await connQuery(
    conn,
    `
    UPDATE bookings
    SET status = 'CONFIRMED'
    WHERE booking_id = ?
      AND status = 'PENDING'
    `,
    [bookingId],
  );
}

export async function findSeatHoldsForPaymentConfirm(
  conn: mysql.PoolConnection,
  bookingId: number,
) {
  return connQuery<{
    seatLayoutDetailId: number;
    seatPrice: string | number;
    tripId: number;
  }>(
    conn,
    `
    SELECT
      sh.seat_layout_detail_id AS seatLayoutDetailId,
      COALESCE(t.ticket_price, st.base_price) AS seatPrice,
      sh.trip_id AS tripId
    FROM seat_holds sh
    INNER JOIN trips t ON t.trip_id = sh.trip_id
    INNER JOIN schedule_templates st ON st.schedule_template_id = t.schedule_template_id
    WHERE sh.booking_id = ?
      AND sh.expired_at > NOW()
    `,
    [bookingId],
  );
}

export async function insertBookingSeatsAfterPayment(
  conn: mysql.PoolConnection,
  bookingId: number,
  tripId: number,
  seats: {
    seatLayoutDetailId: number;
    seatPrice: number;
  }[],
) {
  if (!seats.length) return;

  const values = seats.map((seat) => [
    bookingId,
    tripId,
    seat.seatLayoutDetailId,
    seat.seatPrice,
  ]);

  await conn.query(
    `
    INSERT INTO booking_seats (
      booking_id,
      trip_id,
      seat_layout_detail_id,
      seat_price
    )
    VALUES ?
    `,
    [values],
  );
}

export async function deleteSeatHoldsAfterPayment(
  conn: mysql.PoolConnection,
  bookingId: number,
) {
  await connQuery(
    conn,
    `
    DELETE FROM seat_holds
    WHERE booking_id = ?
    `,
    [bookingId],
  );
}

export async function findPaymentForInternalWalletConfirm(
  conn: mysql.PoolConnection,
  paymentId: number,
) {
  const rows = await connQuery<{
    paymentId: number;
    bookingId: number;
    paymentMethod: PaymentMethodType;
    amount: string | number;
    transactionCode: string;
    status: PaymentStatus;
  }>(
    conn,
    `
    SELECT
      payment_id AS paymentId,
      booking_id AS bookingId,
      payment_method AS paymentMethod,
      amount,
      transaction_code AS transactionCode,
      status
    FROM payments
    WHERE payment_id = ?
      AND status = 'PENDING'
    LIMIT 1
    `,
    [paymentId],
  );

  return rows[0] ?? null;
}

export async function findPaymentForConfirm(
  conn: mysql.PoolConnection,
  paymentId: number,
) {
  const rows = await connQuery<{
    paymentId: number;
    bookingId: number;
    paymentMethod: PaymentMethodType;
    amount: string | number;
    transactionCode: string;
    status: PaymentStatus;
  }>(
    conn,
    `
    SELECT
      payment_id AS paymentId,
      booking_id AS bookingId,
      payment_method AS paymentMethod,
      amount,
      transaction_code AS transactionCode,
      status
    FROM payments
    WHERE payment_id = ?
    LIMIT 1
    `,
    [paymentId],
  );

  return rows[0] ?? null;
}

export async function findPaymentByProviderOrderCode(providerOrderCode: string) {
  const rows = await query<{
    paymentId: number;
    bookingId: number;
    amount: string | number;
    status: PaymentStatus;
    transactionCode: string;
  }>(
    `
    SELECT
      payment_id AS paymentId,
      booking_id AS bookingId,
      amount,
      status,
      transaction_code AS transactionCode
    FROM payments
    WHERE provider_order_code = ?
    LIMIT 1
    `,
    [providerOrderCode],
  );

  return rows[0] ?? null;
}