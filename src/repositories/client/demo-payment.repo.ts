import {
  connExecute,
  connQuery,
  query,
  type PoolConnection,
} from "@/lib/server/mysql";

export type DemoPaymentProvider = "VNPAY" | "MOMO" | "ZALOPAY";

export type DemoPaymentStatus =
  | "PENDING"
  | "VERIFY_REQUIRED"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED"
  | "EXPIRED";

export interface DemoPaymentSessionRow {
  demoSessionId: number;
  paymentId: number;
  provider: DemoPaymentProvider;
  tokenHash: string;
  amount: string | number;
  status: DemoPaymentStatus;

  customerPhone: string | null;
  selectedBank: string | null;
  accountNumberMasked: string | null;
  accountHolder: string | null;
  paymentSource: string | null;

  attemptCount: number;

  expiredAt: string | Date;
  completedAt: string | Date | null;
  createdAt: string | Date;

  transactionCode: string;
  bookingId: number;
  bookingCode: string;
  paymentStatus: string;
}

export async function expireOpenDemoSessions(
  conn: PoolConnection,
  paymentId: number,
): Promise<void> {
  await connQuery(
    conn,
    `
      UPDATE payment_demo_sessions
      SET
        status = 'EXPIRED',
        updated_at = NOW()
      WHERE payment_id = ?
        AND status IN (
          'PENDING',
          'VERIFY_REQUIRED',
          'PROCESSING'
        )
    `,
    [paymentId],
  );
}

export async function insertDemoPaymentSession(
  conn: PoolConnection,
  input: {
    paymentId: number;
    provider: DemoPaymentProvider;
    tokenHash: string;
    amount: number;
    expiredAt: Date;
  },
): Promise<number> {
  const result = await connExecute(
    conn,
    `
      INSERT INTO payment_demo_sessions (
        payment_id,
        provider,
        token_hash,
        amount,
        status,
        expired_at
      )
      VALUES (?, ?, ?, ?, 'PENDING', ?)
    `,
    [
      input.paymentId,
      input.provider,
      input.tokenHash,
      input.amount,
      input.expiredAt,
    ],
  );

  return result.insertId;
}

export async function findDemoSessionByTokenHash(
  tokenHash: string,
): Promise<DemoPaymentSessionRow | null> {
  const rows = await query<DemoPaymentSessionRow>(
    `
      SELECT
        ds.demo_session_id AS demoSessionId,
        ds.payment_id AS paymentId,
        ds.provider,
        ds.token_hash AS tokenHash,
        ds.amount,
        ds.status,

        ds.customer_phone AS customerPhone,
        ds.selected_bank AS selectedBank,
        ds.account_number_masked AS accountNumberMasked,
        ds.account_holder AS accountHolder,
        ds.payment_source AS paymentSource,

        ds.attempt_count AS attemptCount,

        ds.expired_at AS expiredAt,
        ds.completed_at AS completedAt,
        ds.created_at AS createdAt,

        p.transaction_code AS transactionCode,
        p.booking_id AS bookingId,
        p.status AS paymentStatus,

        b.booking_code AS bookingCode

      FROM payment_demo_sessions ds

      INNER JOIN payments p
        ON p.payment_id = ds.payment_id

      INNER JOIN bookings b
        ON b.booking_id = p.booking_id

      WHERE ds.token_hash = ?

      LIMIT 1
    `,
    [tokenHash],
  );

  return rows[0] ?? null;
}

export async function findDemoSessionForUpdate(
  conn: PoolConnection,
  tokenHash: string,
): Promise<DemoPaymentSessionRow | null> {
  const rows = await connQuery<DemoPaymentSessionRow>(
    conn,
    `
      SELECT
        ds.demo_session_id AS demoSessionId,
        ds.payment_id AS paymentId,
        ds.provider,
        ds.token_hash AS tokenHash,
        ds.amount,
        ds.status,

        ds.customer_phone AS customerPhone,
        ds.selected_bank AS selectedBank,
        ds.account_number_masked AS accountNumberMasked,
        ds.account_holder AS accountHolder,
        ds.payment_source AS paymentSource,

        ds.attempt_count AS attemptCount,

        ds.expired_at AS expiredAt,
        ds.completed_at AS completedAt,
        ds.created_at AS createdAt,

        p.transaction_code AS transactionCode,
        p.booking_id AS bookingId,
        p.status AS paymentStatus,

        b.booking_code AS bookingCode

      FROM payment_demo_sessions ds

      INNER JOIN payments p
        ON p.payment_id = ds.payment_id

      INNER JOIN bookings b
        ON b.booking_id = p.booking_id

      WHERE ds.token_hash = ?

      LIMIT 1
      FOR UPDATE
    `,
    [tokenHash],
  );

  return rows[0] ?? null;
}

export async function updateDemoSessionVerification(
  conn: PoolConnection,
  input: {
    demoSessionId: number;
    customerPhone?: string | null;
    selectedBank?: string | null;
    accountNumberMasked?: string | null;
    accountHolder?: string | null;
    paymentSource?: string | null;
  },
): Promise<void> {
  await connQuery(
    conn,
    `
      UPDATE payment_demo_sessions
      SET
        status = 'VERIFY_REQUIRED',

        customer_phone = ?,
        selected_bank = ?,
        account_number_masked = ?,
        account_holder = ?,
        payment_source = ?,

        updated_at = NOW()

      WHERE demo_session_id = ?
        AND status = 'PENDING'
    `,
    [
      input.customerPhone ?? null,
      input.selectedBank ?? null,
      input.accountNumberMasked ?? null,
      input.accountHolder ?? null,
      input.paymentSource ?? null,
      input.demoSessionId,
    ],
  );
}

export async function increaseDemoAttemptCount(
  conn: PoolConnection,
  demoSessionId: number,
): Promise<void> {
  await connQuery(
    conn,
    `
      UPDATE payment_demo_sessions
      SET
        attempt_count = attempt_count + 1,
        updated_at = NOW()
      WHERE demo_session_id = ?
    `,
    [demoSessionId],
  );
}

export async function markDemoSessionProcessing(
  conn: PoolConnection,
  demoSessionId: number,
): Promise<void> {
  await connQuery(
    conn,
    `
      UPDATE payment_demo_sessions
      SET
        status = 'PROCESSING',
        updated_at = NOW()
      WHERE demo_session_id = ?
        AND status = 'VERIFY_REQUIRED'
    `,
    [demoSessionId],
  );
}

export async function markDemoSessionSuccess(
  conn: PoolConnection,
  demoSessionId: number,
): Promise<void> {
  await connQuery(
    conn,
    `
      UPDATE payment_demo_sessions
      SET
        status = 'SUCCESS',
        completed_at = NOW(),
        updated_at = NOW()
      WHERE demo_session_id = ?
        AND status = 'PROCESSING'
    `,
    [demoSessionId],
  );
}

export async function markDemoSessionExpired(
  conn: PoolConnection,
  demoSessionId: number,
): Promise<void> {
  await connQuery(
    conn,
    `
      UPDATE payment_demo_sessions
      SET
        status = 'EXPIRED',
        updated_at = NOW()
      WHERE demo_session_id = ?
        AND status NOT IN ('SUCCESS', 'FAILED', 'EXPIRED')
    `,
    [demoSessionId],
  );
}
