import {
  connExecute,
  connQuery,
  query,
  type PoolConnection,
} from "@/lib/server/mysql";

import type {
  WalletStatus,
  WalletTransactionItem,
} from "@/types/client/wallet/wallet.type";

type WalletRow = {
  walletId: number;
  userId: number;
  balance: string | number;
  status: WalletStatus;
};

type WalletStatisticsRow = {
  totalDeposited: string | number | null;
  totalPaid: string | number | null;
  totalRefunded: string | number | null;
};

type WalletTransactionRow = {
  walletTransactionId: number;

  transactionType: "DEPOSIT" | "PAYMENT" | "REFUND" | "ADJUSTMENT";

  amount: string | number;
  balanceBefore: string | number;
  balanceAfter: string | number;

  referenceCode: string;
  description: string | null;

  paymentId: number | null;
  bookingId: number | null;
  bookingCode: string | null;

  createdAt: string | Date;
};

/**
 * Lấy ví của người dùng.
 */
export async function findWalletByUserId(
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
    `,
    [userId],
  );

  return rows[0] ?? null;
}

/**
 * Tạo ví số dư 0 nếu tài khoản chưa có ví.
 *
 * INSERT IGNORE giúp tránh lỗi khi hai request
 * cùng tạo ví cho một user.
 */
export async function createWalletIfMissing(
  conn: PoolConnection,
  userId: number,
): Promise<void> {
  await connExecute(
    conn,
    `
      INSERT IGNORE INTO wallets (
        user_id,
        balance,
        status
      )
      VALUES (?, 0, 'ACTIVE')
    `,
    [userId],
  );
}

/**
 * Tổng hợp tiền nạp, thanh toán và hoàn tiền.
 */
export async function getWalletStatistics(
  conn: PoolConnection,
  walletId: number,
): Promise<WalletStatisticsRow> {
  const rows = await connQuery<WalletStatisticsRow>(
    conn,
    `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN transaction_type = 'DEPOSIT'
              THEN amount
              ELSE 0
            END
          ),
          0
        ) AS totalDeposited,

        COALESCE(
          SUM(
            CASE
              WHEN transaction_type = 'PAYMENT'
              THEN amount
              ELSE 0
            END
          ),
          0
        ) AS totalPaid,

        COALESCE(
          SUM(
            CASE
              WHEN transaction_type = 'REFUND'
              THEN amount
              ELSE 0
            END
          ),
          0
        ) AS totalRefunded

      FROM wallet_transactions
      WHERE wallet_id = ?
    `,
    [walletId],
  );

  return (
    rows[0] ?? {
      totalDeposited: 0,
      totalPaid: 0,
      totalRefunded: 0,
    }
  );
}

/**
 * Lấy các giao dịch gần nhất của ví.
 */
export async function findRecentWalletTransactions(
  conn: PoolConnection,
  walletId: number,
  limit = 5,
): Promise<WalletTransactionItem[]> {
  const safeLimit = Math.min(Math.max(Math.trunc(limit), 1), 20);

  /*
   * LIMIT không truyền placeholder để tránh một số
   * cấu hình mysql2 không nhận LIMIT ?.
   *
   * safeLimit đã được ép về số nguyên trong khoảng 1–20.
   */
  const rows = await connQuery<WalletTransactionRow>(
    conn,
    `
      SELECT
        wt.wallet_transaction_id AS walletTransactionId,
        wt.transaction_type AS transactionType,

        wt.amount,
        wt.balance_before AS balanceBefore,
        wt.balance_after AS balanceAfter,

        wt.reference_code AS referenceCode,
        wt.description,

        wt.payment_id AS paymentId,
        wt.booking_id AS bookingId,

        b.booking_code AS bookingCode,

        wt.created_at AS createdAt

      FROM wallet_transactions wt

      LEFT JOIN bookings b
        ON b.booking_id = wt.booking_id

      WHERE wt.wallet_id = ?

      ORDER BY
        wt.created_at DESC,
        wt.wallet_transaction_id DESC

      LIMIT ${safeLimit}
    `,
    [walletId],
  );

  return rows.map((row) => ({
    walletTransactionId: Number(row.walletTransactionId),

    transactionType: row.transactionType,

    amount: Number(row.amount),
    balanceBefore: Number(row.balanceBefore),
    balanceAfter: Number(row.balanceAfter),

    referenceCode: row.referenceCode,
    description: row.description,

    paymentId: row.paymentId == null ? null : Number(row.paymentId),

    bookingId: row.bookingId == null ? null : Number(row.bookingId),

    bookingCode: row.bookingCode,

    createdAt: new Date(row.createdAt).toISOString(),
  }));
}
export async function findWalletForUpdate(
  conn: PoolConnection,
  walletId: number,
) {
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
      WHERE wallet_id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [walletId],
  );

  return rows[0] ?? null;
}

export async function updateWalletBalance(
  conn: PoolConnection,
  walletId: number,
  balance: number,
): Promise<void> {
  await connQuery(
    conn,
    `
      UPDATE wallets
      SET
        balance = ?,
        updated_at = NOW()
      WHERE wallet_id = ?
    `,
    [balance, walletId],
  );
}

export async function insertWalletTransaction(
  conn: PoolConnection,
  input: {
    walletId: number;
    paymentId?: number | null;
    bookingId?: number | null;
    topupId?: number | null;

    transactionType: "DEPOSIT" | "PAYMENT" | "REFUND" | "ADJUSTMENT";

    amount: number;
    balanceBefore: number;
    balanceAfter: number;

    referenceCode: string;
    description?: string | null;
  },
): Promise<number> {
  const result = await connExecute(
    conn,
    `
      INSERT INTO wallet_transactions (
        wallet_id,
        payment_id,
        booking_id,
        topup_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        reference_code,
        description
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      input.walletId,
      input.paymentId ?? null,
      input.bookingId ?? null,
      input.topupId ?? null,
      input.transactionType,
      input.amount,
      input.balanceBefore,
      input.balanceAfter,
      input.referenceCode,
      input.description ?? null,
    ],
  );

  return result.insertId;
}
export async function countWalletTransactions(
  conn: PoolConnection,
  walletId: number,
): Promise<number> {
  const rows = await connQuery<{
    total: string | number;
  }>(
    conn,
    `
      SELECT COUNT(*) AS total
      FROM wallet_transactions
      WHERE wallet_id = ?
    `,
    [walletId],
  );

  return Number(rows[0]?.total ?? 0);
}

export async function findWalletTransactionsPaginated(
  conn: PoolConnection,
  input: {
    walletId: number;
    page: number;
    limit: number;
  },
) {
  const offset = (input.page - 1) * input.limit;

  const rows = await connQuery<any>(
    conn,
    `
      SELECT
        wt.wallet_transaction_id AS walletTransactionId,
        wt.transaction_type AS transactionType,

        wt.amount,
        wt.balance_before AS balanceBefore,
        wt.balance_after AS balanceAfter,

        wt.reference_code AS referenceCode,
        wt.description,

        wt.payment_id AS paymentId,
        wt.booking_id AS bookingId,

        b.booking_code AS bookingCode,

        wt.created_at AS createdAt

      FROM wallet_transactions wt

      LEFT JOIN bookings b
        ON b.booking_id = wt.booking_id

      WHERE wt.wallet_id = ?

      ORDER BY
        wt.created_at DESC,
        wt.wallet_transaction_id DESC

      LIMIT ${input.limit}
      OFFSET ${offset}
    `,
    [input.walletId],
  );

  return rows.map((row: any) => ({
    walletTransactionId: Number(row.walletTransactionId),

    transactionType: row.transactionType,

    amount: Number(row.amount),
    balanceBefore: Number(row.balanceBefore),
    balanceAfter: Number(row.balanceAfter),

    referenceCode: row.referenceCode,

    description: row.description,

    paymentId: row.paymentId == null ? null : Number(row.paymentId),

    bookingId: row.bookingId == null ? null : Number(row.bookingId),

    bookingCode: row.bookingCode,

    createdAt: new Date(row.createdAt).toISOString(),
  }));
}
