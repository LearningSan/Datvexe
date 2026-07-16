import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  adjustAdminWalletApi,
  fetchAdminWallets,
  updateAdminWalletStatusApi,
} from "@/services/admin/wallet.service";

import type {
  AdjustAdminWalletPayload,
  AdminWalletListParams,
  UpdateAdminWalletStatusPayload,
} from "@/types/admin/wallets/wallet-management.type";

export function useAdminWallets(params: AdminWalletListParams) {
  return useQuery({
    queryKey: ["admin-wallets", params],

    queryFn: () => fetchAdminWallets(params),

    staleTime: 20_000,
    gcTime: 1000 * 60 * 5,

    refetchOnWindowFocus: false,
    refetchOnReconnect: true,

    retry: 1,
  });
}

export function useUpdateAdminWalletStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["admin-wallet-status"],

    mutationFn: ({
      walletId,
      payload,
    }: {
      walletId: number;
      payload: UpdateAdminWalletStatusPayload;
    }) => updateAdminWalletStatusApi(walletId, payload),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin-wallets"],
      });
    },
  });
}

export function useAdjustAdminWallet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["admin-wallet-adjustment"],

    mutationFn: ({
      walletId,
      payload,
    }: {
      walletId: number;
      payload: AdjustAdminWalletPayload;
    }) => adjustAdminWalletApi(walletId, payload),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin-wallets"],
      });
    },
  });
}
