import { nanoid } from "nanoid";

import { withTransaction } from "@/lib/server/mysql";

import {
  createWalletIfMissing,
  findWalletByUserId,
  findWalletForUpdate,
  insertWalletTransaction,
  updateWalletBalance,
} from "@/repositories/client/wallet.repo";

import {
  findWalletTopupByIdAndUser,
  findWalletTopupByProviderOrderCodeForUpdate,
  insertWalletTopup,
  markWalletTopupSuccess,
  updateWalletTopupGatewayData,
} from "@/repositories/client/wallet-topup.repo";

import { getPayosClient } from "@/services/server/client/payment-gateway.service";

import type {
  CreateWalletTopupResponse,
  WalletTopupStatusResponse,
} from "@/types/client/wallet/wallet.type";

function appHost(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.PAYMENT_PUBLIC_URL ||
    "http://localhost:3000"
  ).replace(/\/+$/, "");
}

export async function createWalletTopup(
  userId: number,
  amountInput: number,
): Promise<CreateWalletTopupResponse> {
  const amount = Math.round(Number(amountInput));

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Tài khoản không hợp lệ");
  }

  if (!Number.isFinite(amount)) {
    throw new Error("Số tiền nạp không hợp lệ");
  }

  if (amount < 10_000) {
    throw new Error("Số tiền nạp tối thiểu là 10.000 đ");
  }

  if (amount > 5_000_000) {
    throw new Error("Số tiền nạp tối đa mỗi lần là 5.000.000 đ");
  }

  return withTransaction(async (conn) => {
    await createWalletIfMissing(conn, userId);

    const wallet = await findWalletByUserId(conn, userId);

    if (!wallet) {
      throw new Error("Không tìm thấy ví");
    }

    if (wallet.status !== "ACTIVE") {
      throw new Error("Ví đang bị khóa");
    }

    const transactionCode =
      `TOPUP${Date.now()}` + nanoid(6).replace(/[^0-9a-zA-Z]/g, "");

    const expiredAt = new Date(Date.now() + 15 * 60 * 1000);

    const topupId = await insertWalletTopup(conn, {
      walletId: Number(wallet.walletId),
      userId,
      amount,
      transactionCode,
      expiredAt,
    });

    /*
     * orderCode PayOS phải là số.
     */
    const orderCode = Number(`${Date.now()}`.slice(-10));

    const payOS = getPayosClient();

    const returnUrl =
      `${appHost()}/account/wallet/deposit/result` + `?topupId=${topupId}`;

    const cancelUrl = `${appHost()}/account/wallet/deposit` + `?cancelled=1`;

    const gateway = await payOS.paymentRequests.create({
      orderCode,
      amount,
      description: `Nap vi ${topupId}`.slice(0, 25),
      returnUrl,
      cancelUrl,
      items: [
        {
          name: "Nạp tiền ví XeKhachPT",
          quantity: 1,
          price: amount,
        },
      ],
    });

    if (!gateway.qrCode) {
      throw new Error("PayOS không trả dữ liệu QR nạp tiền");
    }

    await updateWalletTopupGatewayData(conn, {
      topupId,
      providerOrderCode: String(orderCode),
      paymentUrl: gateway.checkoutUrl ?? null,
      qrCodeUrl: gateway.qrCode,
      gatewayResponse: gateway,
    });

    return {
      topupId,
      transactionCode,
      amount,
      status: "PENDING",
      paymentUrl: gateway.checkoutUrl ?? null,
      qrCodeUrl: gateway.qrCode,
      expiredAt: expiredAt.toISOString(),
    };
  });
}

export async function getWalletTopupStatus(
  userId: number,
  topupId: number,
): Promise<WalletTopupStatusResponse> {
  if (!Number.isInteger(topupId) || topupId <= 0) {
    throw new Error("topupId không hợp lệ");
  }

  const topup = await findWalletTopupByIdAndUser(topupId, userId);

  if (!topup) {
    throw new Error("Giao dịch nạp ví không tồn tại");
  }

  let status = topup.status;

  if (
    status === "PENDING" &&
    new Date(topup.expiredAt).getTime() <= Date.now()
  ) {
    status = "EXPIRED";
  }

  return {
    topupId: Number(topup.topupId),
    status,
    amount: Number(topup.amount),
    completedAt: topup.completedAt
      ? new Date(topup.completedAt).toISOString()
      : null,
  };
}

export async function confirmPayosWalletTopup(input: {
  providerOrderCode: string;
  amount: number;
  gatewayTransactionId: string;
  gatewayResponse: unknown;
}) {
  return withTransaction(async (conn) => {
    const topup = await findWalletTopupByProviderOrderCodeForUpdate(
      conn,
      input.providerOrderCode,
    );

    if (!topup) {
      throw new Error("Không tìm thấy giao dịch nạp ví PayOS");
    }

    if (topup.status === "SUCCESS") {
      return {
        success: true,
        topupId: Number(topup.topupId),
        alreadyProcessed: true,
      };
    }

    if (Math.round(Number(topup.amount)) !== Math.round(Number(input.amount))) {
      throw new Error("Số tiền nạp ví không khớp");
    }

    if (new Date(topup.expiredAt).getTime() <= Date.now()) {
      throw new Error("Giao dịch nạp ví đã hết hạn");
    }

    const wallet = await findWalletForUpdate(conn, Number(topup.walletId));

    if (!wallet) {
      throw new Error("Ví không tồn tại");
    }

    if (wallet.status !== "ACTIVE") {
      throw new Error("Ví đang bị khóa");
    }

    const balanceBefore = Number(wallet.balance);
    const balanceAfter = balanceBefore + Number(topup.amount);

    await updateWalletBalance(conn, Number(wallet.walletId), balanceAfter);

    await insertWalletTransaction(conn, {
      walletId: Number(wallet.walletId),
      topupId: Number(topup.topupId),
      transactionType: "DEPOSIT",
      amount: Number(topup.amount),
      balanceBefore,
      balanceAfter,
      referenceCode: `DEPOSIT-${topup.transactionCode}`,
      description: "Nạp tiền vào ví qua PayOS",
    });

    await markWalletTopupSuccess(conn, {
      topupId: Number(topup.topupId),
      gatewayTransactionId: input.gatewayTransactionId,
      gatewayResponse: input.gatewayResponse,
    });

    return {
      success: true,
      topupId: Number(topup.topupId),
      walletId: Number(wallet.walletId),
      balanceBefore,
      balanceAfter,
      alreadyProcessed: false,
    };
  });
}
