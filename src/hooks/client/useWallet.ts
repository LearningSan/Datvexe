import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createWalletTopupApi,
  fetchMyWallet,
  fetchWalletTopupStatus,
  fetchWalletTransactions,
} from "@/services/client/wallet.service";

import type {
  CreateWalletTopupPayload,
  WalletTopupStatus,
} from "@/types/client/wallet/wallet.type";

const FINAL_TOPUP_STATUSES: WalletTopupStatus[] = [
  "SUCCESS",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
];

export function useMyWallet(enabled = true) {
  return useQuery({
    queryKey: ["my-wallet"],

    queryFn: fetchMyWallet,

    enabled,

    staleTime: 30_000,
    gcTime: 1000 * 60 * 5,

    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,

    retry: 1,
    throwOnError: false,

    meta: {
      globalLoading: false,
    },
  });
}

export function useCreateWalletTopup() {
  return useMutation({
    mutationKey: ["create-wallet-topup"],

    mutationFn: (payload: CreateWalletTopupPayload) =>
      createWalletTopupApi(payload),

    retry: false,
    throwOnError: false,
  });
}

export function useWalletTopupStatus(topupId: number | null, enabled: boolean) {
  const queryClient = useQueryClient();

  return useQuery({
    queryKey: ["wallet-topup-status", topupId],

    queryFn: () => {
      if (!topupId) {
        throw new Error("topupId không hợp lệ");
      }

      return fetchWalletTopupStatus(topupId);
    },

    enabled: Number.isFinite(topupId) && Number(topupId) > 0 && enabled,

    refetchInterval: (query) => {
      const status = query.state.data?.status;

      if (status && FINAL_TOPUP_STATUSES.includes(status)) {
        return false;
      }

      return 2_000;
    },

    refetchIntervalInBackground: true,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    refetchOnMount: true,

    retry: false,
    staleTime: 0,
    gcTime: 1000 * 60 * 5,

    meta: {
      globalLoading: false,
    },

    throwOnError: false,

    /*
     * Khi topup thành công, làm mới số dư
     * và lịch sử giao dịch ví.
     */
    select: (data) => {
      if (data.status === "SUCCESS") {
        void queryClient.invalidateQueries({
          queryKey: ["my-wallet"],
        });

        void queryClient.invalidateQueries({
          queryKey: ["wallet-transactions"],
        });
      }

      return data;
    },
  });
}

export function useWalletTransactions(
  page: number,
  limit = 10,
  enabled = true,
) {
  return useQuery({
    queryKey: ["wallet-transactions", page, limit],

    queryFn: () =>
      fetchWalletTransactions({
        page,
        limit,
      }),

    enabled: enabled && Number.isInteger(page) && page > 0,

    staleTime: 20_000,
    gcTime: 1000 * 60 * 5,

    refetchOnMount: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: false,

    retry: 1,
    throwOnError: false,

    meta: {
      globalLoading: false,
    },
  });
}
