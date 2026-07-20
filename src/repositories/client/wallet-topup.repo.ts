import {
  connExecute,
  connQuery,
  query,
  type PoolConnection,
} from "@/lib/server/mysql";

import type { WalletTopupStatus } from "@/types/client/wallet/wallet.type";

export type WalletTopupRow = {
  topupId: number;
  walletId: number;
  userId: number;

  amount: string | number;
  status: WalletTopupStatus;

  transactionCode: string;

  providerOrderCode: string | null;
  paymentUrl: string | null;
  qrCodeUrl: string | null;

  gatewayTransactionId: string | null;
  gatewayResponse: unknown;

  expiredAt: string | Date;
  completedAt: string | Date | null;
};

export async function insertWalletTopup(
  conn: PoolConnection,
  input: {
    walletId: number;
    userId: number;
    amount: number;
    transactionCode: string;
    expiredAt: Date;
  },
): Promise<number> {
  const result = await connExecute(
    conn,
    `
      INSERT INTO wallet_topups (
        wallet_id,
        user_id,
        amount,
        status,
        transaction_code,
        provider,
        expired_at
      )
      VALUES (?, ?, ?, 'PENDING', ?, 'PAYOS', ?)
    `,
    [
      input.walletId,
      input.userId,
      input.amount,
      input.transactionCode,
      input.expiredAt,
    ],
  );

  return result.insertId;
}

export async function updateWalletTopupGatewayData(
  conn: PoolConnection,
  input: {
    topupId: number;
    providerOrderCode: string;
    paymentUrl: string | null;
    qrCodeUrl: string | null;
    gatewayResponse: unknown;
  },
): Promise<void> {
  await connQuery(
    conn,
    `
      UPDATE wallet_topups
      SET
        provider_order_code = ?,
        payment_url = ?,
        qr_code_url = ?,
        gateway_response = ?,
        updated_at = NOW()
      WHERE topup_id = ?
        AND status = 'PENDING'
    `,
    [
      input.providerOrderCode,
      input.paymentUrl,
      input.qrCodeUrl,
      JSON.stringify(input.gatewayResponse ?? {}),
      input.topupId,
    ],
  );
}

export async function findWalletTopupByIdAndUser(
  topupId: number,
  userId: number,
): Promise<WalletTopupRow | null> {
  const rows = await query<WalletTopupRow>(
    `
      SELECT
        topup_id AS topupId,
        wallet_id AS walletId,
        user_id AS userId,

        amount,
        status,

        transaction_code AS transactionCode,

        provider_order_code AS providerOrderCode,
        payment_url AS paymentUrl,
        qr_code_url AS qrCodeUrl,

        gateway_transaction_id AS gatewayTransactionId,
        gateway_response AS gatewayResponse,

        expired_at AS expiredAt,
        completed_at AS completedAt

      FROM wallet_topups

      WHERE topup_id = ?
        AND user_id = ?

      LIMIT 1
    `,
    [topupId, userId],
  );

  return rows[0] ?? null;
}

export async function findWalletTopupByProviderOrderCodeForUpdate(
  conn: PoolConnection,
  providerOrderCode: string,
): Promise<WalletTopupRow | null> {
  const rows = await connQuery<WalletTopupRow>(
    conn,
    `
      SELECT
        topup_id AS topupId,
        wallet_id AS walletId,
        user_id AS userId,

        amount,
        status,

        transaction_code AS transactionCode,

        provider_order_code AS providerOrderCode,
        payment_url AS paymentUrl,
        qr_code_url AS qrCodeUrl,

        gateway_transaction_id AS gatewayTransactionId,
        gateway_response AS gatewayResponse,

        expired_at AS expiredAt,
        completed_at AS completedAt

      FROM wallet_topups

      WHERE provider_order_code = ?

      LIMIT 1
      FOR UPDATE
    `,
    [providerOrderCode],
  );

  return rows[0] ?? null;
}

export async function markWalletTopupSuccess(
  conn: PoolConnection,
  input: {
    topupId: number;
    gatewayTransactionId: string;
    gatewayResponse: unknown;
  },
): Promise<void> {
  await connQuery(
    conn,
    `
      UPDATE wallet_topups
      SET
        status = 'SUCCESS',
        gateway_transaction_id = ?,
        gateway_response = ?,
        completed_at = NOW(),
        updated_at = NOW()
      WHERE topup_id = ?
        AND status IN ('PENDING', 'PROCESSING')
    `,
    [
      input.gatewayTransactionId,
      JSON.stringify(input.gatewayResponse ?? {}),
      input.topupId,
    ],
  );
}
