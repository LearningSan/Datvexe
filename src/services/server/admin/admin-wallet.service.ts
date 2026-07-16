import { withTransaction } from "@/lib/server/mysql";

import {
  findAdminWalletForUpdate,
  findAdminWallets,
  insertAdminWalletAdjustment,
  updateAdminWalletBalanceRepo,
  updateAdminWalletStatusRepo,
} from "@/repositories/admin/wallet.repo";

import type {
  AdjustAdminWalletPayload,
  AdminWalletListParams,
  UpdateAdminWalletStatusPayload,
} from "@/types/admin/wallets/wallet-management.type";

export async function getAdminWallets(params: AdminWalletListParams) {
  return findAdminWallets(params);
}

export async function updateAdminWalletStatus(
  walletId: number,
  payload: UpdateAdminWalletStatusPayload,
) {
  return withTransaction(async (conn) => {
    const wallet = await findAdminWalletForUpdate(conn, walletId);

    if (!wallet) {
      throw new Error("Ví không tồn tại");
    }

    if (wallet.status === payload.status) {
      return {
        walletId,
        status: wallet.status,
        unchanged: true,
      };
    }

    await updateAdminWalletStatusRepo(conn, walletId, payload.status);

    return {
      walletId,
      status: payload.status,
      unchanged: false,
    };
  });
}

export async function adjustAdminWalletBalance(
  walletId: number,
  payload: AdjustAdminWalletPayload,
) {
  return withTransaction(async (conn) => {
    const wallet = await findAdminWalletForUpdate(conn, walletId);

    if (!wallet) {
      throw new Error("Ví không tồn tại");
    }

    const amount = Math.round(Number(payload.amount));

    const balanceBefore = Number(wallet.balance);

    const balanceAfter =
      payload.adjustmentType === "INCREASE"
        ? balanceBefore + amount
        : balanceBefore - amount;

    if (balanceAfter < 0) {
      throw new Error("Không thể giảm số dư xuống dưới 0");
    }

    await updateAdminWalletBalanceRepo(conn, walletId, balanceAfter);

    const direction = payload.adjustmentType === "INCREASE" ? "Cộng" : "Trừ";

    await insertAdminWalletAdjustment(conn, {
      walletId,

      /*
       * amount luôn lưu số dương.
       * balanceBefore/After thể hiện hướng.
       */
      amount,

      balanceBefore,
      balanceAfter,

      referenceCode: `ADMIN-ADJ-${walletId}-${Date.now()}`,

      description: `${direction} ${amount.toLocaleString(
        "vi-VN",
      )} đ. Lý do: ${payload.reason}`,
    });

    return {
      walletId,
      balanceBefore,
      balanceAfter,
    };
  });
}
