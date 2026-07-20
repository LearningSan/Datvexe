import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  confirmCheckinApi,
  lookupCheckinQrApi,
} from "@/services/admin/checkin/checkin.service";

import type {
  ConfirmCheckinPayload,
  LookupCheckinQrPayload,
} from "@/types/admin/checkin/checkin.type";

export function useLookupCheckinQr() {
  return useMutation({
    mutationKey: ["admin-checkin-lookup"],

    mutationFn: (payload: LookupCheckinQrPayload) =>
      lookupCheckinQrApi(payload),

    retry: false,
    throwOnError: false,
  });
}

export function useConfirmCheckin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: ["admin-checkin-confirm"],

    mutationFn: (payload: ConfirmCheckinPayload) => confirmCheckinApi(payload),

    retry: false,
    throwOnError: false,

    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["admin-trips"],
        }),

        queryClient.invalidateQueries({
          queryKey: ["admin-tickets"],
        }),
      ]);
    },
  });
}
