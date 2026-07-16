import { withTransaction } from "@/lib/server/mysql";

import {
  createWalletIfMissing,
  findRecentWalletTransactions,
  findWalletByUserId,
  getWalletStatistics,
  countWalletTransactions,
  findWalletTransactionsPaginated,
} from "@/repositories/client/wallet.repo";

import type {
  WalletSummaryResponse,
  WalletTransactionListResponse,
} from "@/types/client/wallet/wallet.type";

export async function getMyWallet(
  userId: number,
): Promise<WalletSummaryResponse> {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("userId không hợp lệ");
  }

  return withTransaction(async (conn) => {
    /*
     * Tạo ví rỗng khi tài khoản đăng nhập lần đầu
     * nhưng chưa có bản ghi wallets.
     */
    await createWalletIfMissing(conn, userId);

    const wallet = await findWalletByUserId(conn, userId);

    if (!wallet) {
      throw new Error("Không thể khởi tạo ví cho tài khoản");
    }

    const walletId = Number(wallet.walletId);
    const balance = Number(wallet.balance);

    const [statistics, recentTransactions] = await Promise.all([
      getWalletStatistics(conn, walletId),

      findRecentWalletTransactions(conn, walletId, 5),
    ]);

    return {
      walletId,
      userId: Number(wallet.userId),

      balance,

      /*
       * Hiện chưa có nghiệp vụ đóng băng số dư,
       * nên availableBalance bằng balance.
       */
      availableBalance: balance,

      status: wallet.status,

      totalDeposited: Number(statistics.totalDeposited ?? 0),

      totalPaid: Number(statistics.totalPaid ?? 0),

      totalRefunded: Number(statistics.totalRefunded ?? 0),

      recentTransactions,
    };
  });
}
export async function getMyWalletTransactions(
  userId: number,
  pageInput: number,
  limitInput: number,
): Promise<WalletTransactionListResponse> {
  const page = Math.max(Math.trunc(pageInput || 1), 1);

  const limit = Math.min(Math.max(Math.trunc(limitInput || 10), 1), 50);

  return withTransaction(async (conn) => {
    const wallet = await findWalletByUserId(conn, userId);

    if (!wallet) {
      return {
        items: [],
        pagination: {
          page,
          limit,
          totalItems: 0,
          totalPages: 0,
        },
      };
    }

    const walletId = Number(wallet.walletId);

    const [totalItems, items] = await Promise.all([
      countWalletTransactions(conn, walletId),

      findWalletTransactionsPaginated(conn, {
        walletId,
        page,
        limit,
      }),
    ]);

    return {
      items,

      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.ceil(totalItems / limit),
      },
    };
  });
}
