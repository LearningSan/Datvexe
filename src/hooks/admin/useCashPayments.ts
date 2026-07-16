import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  confirmCashPaymentApi,
  fetchAdminCashPayments,
  lookupCashPaymentApi,
} from "@/services/admin/cash-payment.service";

import type {
  AdminCashPaymentListParams,
  ConfirmCashPaymentPayload,
  LookupCashPaymentPayload,
} from "@/types/admin/payments/cash-payment.type";

export function useAdminCashPayments(params: AdminCashPaymentListParams) {
  return useQuery({
    queryKey: ["admin-cash-payments", params],

    queryFn: () => fetchAdminCashPayments(params),

    staleTime: 15_000,
    gcTime: 1000 * 60 * 5,

    refetchOnWindowFocus: false,
    refetchOnReconnect: true,

    retry: 1,
    throwOnError: false,
  });
}

export function useLookupCashPayment() {
  return useMutation({
    mutationKey: ["admin-cash-payment-lookup"],

    mutationFn: (payload: LookupCashPaymentPayload) =>
      lookupCashPaymentApi(payload),

    retry: false,
  });
}

export function useConfirmCashPayment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["admin-cash-payment-confirm"],

    mutationFn: (payload: ConfirmCashPaymentPayload) =>
      confirmCashPaymentApi(payload),

    retry: false,

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin-cash-payments"],
      });

      await queryClient.invalidateQueries({
        queryKey: ["admin-payments"],
      });
    },
  });
}
