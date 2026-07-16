import { connQuery, query, type PoolConnection } from "@/lib/server/mysql";

import type {
  AdminCashPaymentItem,
  AdminCashPaymentListParams,
  AdminCashPaymentSummary,
} from "@/types/admin/payments/cash-payment.type";

type CashPaymentRow = {
  paymentId: number;
  bookingId: number;

  bookingCode: string;
  transactionCode: string;

  customerName: string;
  customerPhone: string;
  customerEmail: string | null;

  originCity: string | null;
  destinationCity: string | null;
  departureDatetime: string | Date | null;

  seatNumbersRaw: string | null;

  amount: string | number;

  paymentStatus: AdminCashPaymentItem["paymentStatus"];
  bookingStatus: AdminCashPaymentItem["bookingStatus"];

  holdExpiredAt: string | Date | null;
  createdAt: string | Date;
  paidAt: string | Date | null;
};

function mapCashPaymentRow(row: CashPaymentRow): AdminCashPaymentItem {
  return {
    paymentId: Number(row.paymentId),
    bookingId: Number(row.bookingId),

    bookingCode: row.bookingCode,
    transactionCode: row.transactionCode,

    customerName: row.customerName,
    customerPhone: row.customerPhone,
    customerEmail: row.customerEmail,

    routeName:
      row.originCity && row.destinationCity
        ? `${row.originCity} → ${row.destinationCity}`
        : "Chưa cập nhật",

    departureDatetime: row.departureDatetime
      ? new Date(row.departureDatetime).toISOString()
      : null,

    seatNumbers: row.seatNumbersRaw
      ? row.seatNumbersRaw
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean)
      : [],

    amount: Number(row.amount),

    paymentStatus: row.paymentStatus,
    bookingStatus: row.bookingStatus,

    holdExpiredAt: row.holdExpiredAt
      ? new Date(row.holdExpiredAt).toISOString()
      : null,

    createdAt: new Date(row.createdAt).toISOString(),

    paidAt: row.paidAt ? new Date(row.paidAt).toISOString() : null,
  };
}

const BASE_FROM_SQL = `
  FROM payments p

  INNER JOIN bookings b
    ON b.booking_id = p.booking_id

  INNER JOIN trips t
    ON t.trip_id = b.trip_id

  INNER JOIN routes r
    ON r.route_id = t.route_id

  INNER JOIN cities oc
    ON oc.city_id = r.origin_city_id

  INNER JOIN cities dc
    ON dc.city_id = r.destination_city_id

  LEFT JOIN seat_holds sh
    ON sh.booking_id = b.booking_id

  LEFT JOIN booking_seats bs
    ON bs.booking_id = b.booking_id

  LEFT JOIN seat_layout_details sld
    ON sld.seat_layout_detail_id =
      COALESCE(
        bs.seat_layout_detail_id,
        sh.seat_layout_detail_id
      )
`;

export async function findAdminCashPayments(
  params: AdminCashPaymentListParams,
) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const offset = (page - 1) * limit;

  const keyword = params.keyword?.trim() ?? "";

  let whereSql = `
    WHERE p.payment_method = 'CASH'
      AND (
        ? = ''
        OR p.transaction_code LIKE ?
        OR b.booking_code LIKE ?
        OR b.contact_name LIKE ?
        OR b.contact_phone LIKE ?
        OR b.contact_email LIKE ?
      )
  `;

  const values: Array<string | number> = [
    keyword,
    `%${keyword}%`,
    `%${keyword}%`,
    `%${keyword}%`,
    `%${keyword}%`,
    `%${keyword}%`,
  ];

  if (params.status === "EXPIRED") {
    whereSql += `
      AND p.status = 'PENDING'
      AND b.hold_expired_at <= NOW()
    `;
  } else if (params.status) {
    whereSql += ` AND p.status = ?`;
    values.push(params.status);
  }

  const itemsSql = `
    SELECT
      p.payment_id AS paymentId,
      p.booking_id AS bookingId,

      b.booking_code AS bookingCode,
      p.transaction_code AS transactionCode,

      b.contact_name AS customerName,
      b.contact_phone AS customerPhone,
      b.contact_email AS customerEmail,

      oc.city_name AS originCity,
      dc.city_name AS destinationCity,

      t.departure_datetime AS departureDatetime,

      GROUP_CONCAT(
        DISTINCT sld.seat_number
        ORDER BY sld.seat_number
        SEPARATOR ','
      ) AS seatNumbersRaw,

      p.amount,

      p.status AS paymentStatus,
      b.status AS bookingStatus,

      b.hold_expired_at AS holdExpiredAt,
      p.created_at AS createdAt,
      p.paid_at AS paidAt

    ${BASE_FROM_SQL}

    ${whereSql}

    GROUP BY
      p.payment_id,
      p.booking_id,
      b.booking_code,
      p.transaction_code,
      b.contact_name,
      b.contact_phone,
      b.contact_email,
      oc.city_name,
      dc.city_name,
      t.departure_datetime,
      p.amount,
      p.status,
      b.status,
      b.hold_expired_at,
      p.created_at,
      p.paid_at

    ORDER BY
      CASE
        WHEN p.status = 'PENDING'
          AND b.hold_expired_at > NOW()
        THEN 0

        WHEN p.status = 'WAITING_CONFIRM'
        THEN 1

        WHEN p.status = 'PAID'
        THEN 2

        ELSE 3
      END,
      p.created_at DESC

    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(DISTINCT p.payment_id) AS total
    ${BASE_FROM_SQL}
    ${whereSql}
  `;

  const itemRows = await query<CashPaymentRow>(itemsSql, [
    ...values,
    limit,
    offset,
  ]);

  const countRows = await query<{
    total: string | number;
  }>(countSql, values);

  const summary = await findAdminCashPaymentSummary();

  return {
    items: itemRows.map(mapCashPaymentRow),
    total: Number(countRows[0]?.total ?? 0),
    page,
    limit,
    summary,
  };
}

export async function findAdminCashPaymentSummary(): Promise<AdminCashPaymentSummary> {
  const rows = await query<{
    pendingCount: string | number;
    waitingCount: string | number;
    paidTodayCount: string | number;
    paidTodayAmount: string | number;
    expiredCount: string | number;
  }>(
    `
      SELECT
        SUM(
          CASE
            WHEN p.status = 'PENDING'
              AND b.hold_expired_at > NOW()
            THEN 1
            ELSE 0
          END
        ) AS pendingCount,

        SUM(
          CASE
            WHEN p.status = 'WAITING_CONFIRM'
            THEN 1
            ELSE 0
          END
        ) AS waitingCount,

        SUM(
          CASE
            WHEN p.status = 'PAID'
              AND DATE(p.paid_at) = CURDATE()
            THEN 1
            ELSE 0
          END
        ) AS paidTodayCount,

        SUM(
          CASE
            WHEN p.status = 'PAID'
              AND DATE(p.paid_at) = CURDATE()
            THEN p.amount
            ELSE 0
          END
        ) AS paidTodayAmount,

        SUM(
          CASE
            WHEN p.status = 'PENDING'
              AND b.hold_expired_at <= NOW()
            THEN 1
            ELSE 0
          END
        ) AS expiredCount

      FROM payments p

      INNER JOIN bookings b
        ON b.booking_id = p.booking_id

      WHERE p.payment_method = 'CASH'
    `,
  );

  const row = rows[0];

  return {
    pendingCount: Number(row?.pendingCount ?? 0),

    waitingCount: Number(row?.waitingCount ?? 0),

    paidTodayCount: Number(row?.paidTodayCount ?? 0),

    paidTodayAmount: Number(row?.paidTodayAmount ?? 0),

    expiredCount: Number(row?.expiredCount ?? 0),
  };
}

export async function findCashPaymentByTransactionCode(
  transactionCode: string,
) {
  const rows = await query<CashPaymentRow>(
    `
      SELECT
        p.payment_id AS paymentId,
        p.booking_id AS bookingId,

        b.booking_code AS bookingCode,
        p.transaction_code AS transactionCode,

        b.contact_name AS customerName,
        b.contact_phone AS customerPhone,
        b.contact_email AS customerEmail,

        oc.city_name AS originCity,
        dc.city_name AS destinationCity,

        t.departure_datetime AS departureDatetime,

        GROUP_CONCAT(
          DISTINCT sld.seat_number
          ORDER BY sld.seat_number
          SEPARATOR ','
        ) AS seatNumbersRaw,

        p.amount,

        p.status AS paymentStatus,
        b.status AS bookingStatus,

        b.hold_expired_at AS holdExpiredAt,
        p.created_at AS createdAt,
        p.paid_at AS paidAt

      ${BASE_FROM_SQL}

      WHERE p.payment_method = 'CASH'
        AND p.transaction_code = ?

      GROUP BY
        p.payment_id,
        p.booking_id,
        b.booking_code,
        p.transaction_code,
        b.contact_name,
        b.contact_phone,
        b.contact_email,
        oc.city_name,
        dc.city_name,
        t.departure_datetime,
        p.amount,
        p.status,
        b.status,
        b.hold_expired_at,
        p.created_at,
        p.paid_at

      LIMIT 1
    `,
    [transactionCode],
  );

  return rows[0] ? mapCashPaymentRow(rows[0]) : null;
}

export async function findCashPaymentForUpdate(
  conn: PoolConnection,
  transactionCode: string,
) {
  const rows = await connQuery<{
    paymentId: number;
    bookingId: number;
    status: string;
    amount: string | number;
    transactionCode: string;
  }>(
    conn,
    `
      SELECT
        payment_id AS paymentId,
        booking_id AS bookingId,
        status,
        amount,
        transaction_code AS transactionCode

      FROM payments

      WHERE payment_method = 'CASH'
        AND transaction_code = ?

      LIMIT 1
      FOR UPDATE
    `,
    [transactionCode],
  );

  return rows[0] ?? null;
}
