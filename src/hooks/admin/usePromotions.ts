import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAdminPromotionApi,
  deleteAdminPromotionApi,
  fetchAdminPromotionDetail,
  fetchAdminPromotions,
  updateAdminPromotionApi,
  updateAdminPromotionStatusApi,
} from "@/services/admin/promotion.service";

import type {
  AdminPromotionListParams,
  CreateAdminPromotionPayload,
  UpdateAdminPromotionPayload,
} from "@/types/admin/promotion/promotion-management.type";

export function usePromotions(params: AdminPromotionListParams) {
  return useQuery({
    queryKey: ["admin-promotions", params],
    queryFn: () => fetchAdminPromotions(params),
    staleTime: 1000 * 60,
    retry: 1,
  });
}

export function usePromotionDetail(promotionId: number | null) {
  return useQuery({
    queryKey: ["admin-promotion-detail", promotionId],

    queryFn: () => {
      if (!promotionId) {
        throw new Error("Thiếu ID khuyến mãi");
      }

      return fetchAdminPromotionDetail(promotionId);
    },

    enabled: !!promotionId,
    staleTime: 1000 * 30,
  });
}

export function useCreatePromotion() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, CreateAdminPromotionPayload>({
    mutationFn: createAdminPromotionApi,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-promotions"],
      });
    },
  });
}

export function useUpdatePromotion() {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    Error,
    {
      promotionId: number;
      payload: UpdateAdminPromotionPayload;
    }
  >({
    mutationFn: ({ promotionId, payload }) =>
      updateAdminPromotionApi(promotionId, payload),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-promotions"],
      });

      queryClient.invalidateQueries({
        queryKey: ["admin-promotion-detail"],
      });
    },
  });
}

export function useUpdatePromotionStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    Error,
    {
      promotionId: number;
      isActive: boolean;
    }
  >({
    mutationFn: ({ promotionId, isActive }) =>
      updateAdminPromotionStatusApi(promotionId, isActive),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-promotions"],
      });

      queryClient.invalidateQueries({
        queryKey: ["admin-promotion-detail"],
      });
    },
  });
}

export function useDeletePromotion() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, number>({
    mutationFn: deleteAdminPromotionApi,

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-promotions"],
      });
    },
  });
}
