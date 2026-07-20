import {
  connExecute,
  connQuery,
  query,
  type PoolConnection,
} from "@/lib/server/mysql";

import type {
  AdminWalletItem,
  AdminWalletListParams,
} from "@/types/admin/wallets/wallet-management.type";

type AdminWalletRow = {
  walletId: number;
  userId: number;

  fullName: string;
  email: string;
  phone: string | null;

  balance: string | number;
  status: "ACTIVE" | "LOCKED";

  totalDeposited: string | number | null;

  totalPaid: string | number | null;

  totalRefunded: string | number | null;

  transactionCount: string | number;

  createdAt: string | Date;
  updatedAt: string | Date;
};

function mapWalletRow(row: AdminWalletRow): AdminWalletItem {
  return {
    walletId: Number(row.walletId),
    userId: Number(row.userId),

    fullName: row.fullName,
    email: row.email,
    phone: row.phone,

    balance: Number(row.balance),
    status: row.status,

    totalDeposited: Number(row.totalDeposited ?? 0),

    totalPaid: Number(row.totalPaid ?? 0),

    totalRefunded: Number(row.totalRefunded ?? 0),

    transactionCount: Number(row.transactionCount ?? 0),

    createdAt: new Date(row.createdAt).toISOString(),

    updatedAt: new Date(row.updatedAt).toISOString(),
  };
}

export async function findAdminWallets(params: AdminWalletListParams) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const offset = (page - 1) * limit;

  const keyword = params.keyword?.trim() ?? "";

  let whereSql = `
    WHERE (
      ? = ''
      OR u.full_name LIKE ?
      OR u.email LIKE ?
      OR u.phone LIKE ?
      OR w.wallet_id = ?
    )
  `;

  const numericKeyword = Number(keyword);

  const values: Array<string | number> = [
    keyword,
    `%${keyword}%`,
    `%${keyword}%`,
    `%${keyword}%`,
    Number.isFinite(numericKeyword) ? numericKeyword : -1,
  ];

  if (params.status) {
    whereSql += `
      AND w.status = ?
    `;

    values.push(params.status);
  }

  const itemsSql = `
    SELECT
      w.wallet_id AS walletId,
      w.user_id AS userId,

      u.full_name AS fullName,
      u.email,
      u.phone,

      w.balance,
      w.status,

      COALESCE(
        SUM(
          CASE
            WHEN wt.transaction_type =
              'DEPOSIT'
            THEN wt.amount
            ELSE 0
          END
        ),
        0
      ) AS totalDeposited,

      COALESCE(
        SUM(
          CASE
            WHEN wt.transaction_type =
              'PAYMENT'
            THEN wt.amount
            ELSE 0
          END
        ),
        0
      ) AS totalPaid,

      COALESCE(
        SUM(
          CASE
            WHEN wt.transaction_type =
              'REFUND'
            THEN wt.amount
            ELSE 0
          END
        ),
        0
      ) AS totalRefunded,

      COUNT(
        wt.wallet_transaction_id
      ) AS transactionCount,

      w.created_at AS createdAt,
      w.updated_at AS updatedAt

    FROM wallets w

    INNER JOIN users u
      ON u.user_id = w.user_id

    LEFT JOIN wallet_transactions wt
      ON wt.wallet_id = w.wallet_id

    ${whereSql}

    GROUP BY
      w.wallet_id,
      w.user_id,
      u.full_name,
      u.email,
      u.phone,
      w.balance,
      w.status,
      w.created_at,
      w.updated_at

    ORDER BY
      w.updated_at DESC,
      w.wallet_id DESC

    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total

    FROM wallets w

    INNER JOIN users u
      ON u.user_id = w.user_id

    ${whereSql}
  `;

  const itemRows = await query<AdminWalletRow>(itemsSql, [
    ...values,
    limit,
    offset,
  ]);

  const countRows = await query<{
    total: string | number;
  }>(countSql, values);

  const summary = await findAdminWalletSummary();

  return {
    items: itemRows.map(mapWalletRow),

    total: Number(countRows[0]?.total ?? 0),

    page,
    limit,
    summary,
  };
}

export async function findAdminWalletSummary() {
  const rows = await query<{
    totalWallets: string | number;
    activeWallets: string | number;
    lockedWallets: string | number;

    totalBalance: string | number;
    totalDeposited: string | number;
    totalPaid: string | number;
  }>(
    `
      SELECT
        COUNT(*) AS totalWallets,

        SUM(
          CASE
            WHEN status = 'ACTIVE'
            THEN 1
            ELSE 0
          END
        ) AS activeWallets,

        SUM(
          CASE
            WHEN status = 'LOCKED'
            THEN 1
            ELSE 0
          END
        ) AS lockedWallets,

        COALESCE(
          SUM(balance),
          0
        ) AS totalBalance,

        (
          SELECT COALESCE(
            SUM(amount),
            0
          )
          FROM wallet_transactions
          WHERE transaction_type =
            'DEPOSIT'
        ) AS totalDeposited,

        (
          SELECT COALESCE(
            SUM(amount),
            0
          )
          FROM wallet_transactions
          WHERE transaction_type =
            'PAYMENT'
        ) AS totalPaid

      FROM wallets
    `,
  );

  const row = rows[0];

  return {
    totalWallets: Number(row?.totalWallets ?? 0),

    activeWallets: Number(row?.activeWallets ?? 0),

    lockedWallets: Number(row?.lockedWallets ?? 0),

    totalBalance: Number(row?.totalBalance ?? 0),

    totalDeposited: Number(row?.totalDeposited ?? 0),

    totalPaid: Number(row?.totalPaid ?? 0),
  };
}

export async function findAdminWalletForUpdate(
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

export async function updateAdminWalletStatusRepo(
  conn: PoolConnection,
  walletId: number,
  status: "ACTIVE" | "LOCKED",
) {
  await connQuery(
    conn,
    `
      UPDATE wallets
      SET status = ?
      WHERE wallet_id = ?
    `,
    [status, walletId],
  );
}

export async function updateAdminWalletBalanceRepo(
  conn: PoolConnection,
  walletId: number,
  balance: number,
) {
  await connQuery(
    conn,
    `
      UPDATE wallets
      SET balance = ?
      WHERE wallet_id = ?
    `,
    [balance, walletId],
  );
}

export async function insertAdminWalletAdjustment(
  conn: PoolConnection,
  input: {
    walletId: number;

    amount: number;
    balanceBefore: number;
    balanceAfter: number;

    referenceCode: string;
    description: string;
  },
) {
  const result = await connExecute(
    conn,
    `
        INSERT INTO wallet_transactions (
          wallet_id,
          transaction_type,
          amount,
          balance_before,
          balance_after,
          reference_code,
          description,
          created_at
        )
        VALUES (
          ?,
          'ADJUSTMENT',
          ?,
          ?,
          ?,
          ?,
          ?,
          NOW()
        )
      `,
    [
      input.walletId,
      input.amount,
      input.balanceBefore,
      input.balanceAfter,
      input.referenceCode,
      input.description,
    ],
  );

  return result.insertId;
}
