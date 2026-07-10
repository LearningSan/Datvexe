import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAdminPickupPointApi,
  deleteAdminPickupPointApi,
  fetchAdminPickupPointDetail,
  fetchAdminPickupPoints,
  updateAdminPickupPointApi,
  updateAdminPickupPointStatusApi,
  fetchAdminPickupPointLocationOptions,
} from "@/services/admin/pickup-point.service";

import type {
  AdminPickupPointListParams,
  CreateAdminPickupPointPayload,
  UpdateAdminPickupPointPayload,
} from "@/types/admin/pickup-points/pickup-point-management.type";

interface ApiError {
  message?: string;
  statusCode?: number;
  error?: string;
}
export function usePickupPointLocationOptions(cityId?: number) {
  return useQuery({
    queryKey: ["admin-pickup-point-location-options", cityId],
    queryFn: () => fetchAdminPickupPointLocationOptions(cityId),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}
export function usePickupPoints(params: AdminPickupPointListParams) {
  return useQuery({
    queryKey: ["admin-pickup-points", params],
    queryFn: () => fetchAdminPickupPoints(params),
    staleTime: 1000 * 60,
    retry: 1,
  });
}

export function usePickupPointDetail(pickupPointId?: number) {
  return useQuery({
    queryKey: ["admin-pickup-point-detail", pickupPointId],
    queryFn: () => fetchAdminPickupPointDetail(pickupPointId!),
    enabled: !!pickupPointId,
    staleTime: 1000 * 60,
    retry: 1,
  });
}

export function useCreatePickupPoint() {
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, CreateAdminPickupPointPayload>({
    mutationFn: createAdminPickupPointApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pickup-points"] });
    },
  });
}

export function useUpdatePickupPoint() {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    ApiError,
    {
      pickupPointId: number;
      payload: UpdateAdminPickupPointPayload;
    }
  >({
    mutationFn: ({ pickupPointId, payload }) =>
      updateAdminPickupPointApi(pickupPointId, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-pickup-points"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-pickup-point-detail", variables.pickupPointId],
      });
    },
  });
}

export function useUpdatePickupPointStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    ApiError,
    {
      pickupPointId: number;
      isActive: boolean;
    }
  >({
    mutationFn: ({ pickupPointId, isActive }) =>
      updateAdminPickupPointStatusApi(pickupPointId, isActive),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-pickup-points"] });
      queryClient.invalidateQueries({
        queryKey: ["admin-pickup-point-detail", variables.pickupPointId],
      });
    },
  });
}

export function useDeletePickupPoint() {
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, number>({
    mutationFn: deleteAdminPickupPointApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pickup-points"] });
    },
  });
}
