import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAdminRouteApi,
  duplicateReverseRouteApi,
  fetchAdminRouteOptions,
  fetchAdminRoutes,
  updateAdminRouteApi,
  updateAdminRouteStatusApi,
} from "@/services/admin/route.service";

import type {
  AdminRouteListParams,
  AdminRoutePayload,
} from "@/types/admin/routes/route-management.type";

interface ApiError {
  message?: string;
  statusCode?: number;
  error?: string;
}

export function useAdminRoutes(params: AdminRouteListParams) {
  return useQuery({
    queryKey: ["admin-routes", params],
    queryFn: () => fetchAdminRoutes(params),
    staleTime: 1000 * 60,
    retry: 1,
  });
}

export function useAdminRouteOptions() {
  return useQuery({
    queryKey: ["admin-route-options"],
    queryFn: fetchAdminRouteOptions,
    staleTime: 1000 * 60 * 5,
  });
}

export function useCreateAdminRoute() {
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, AdminRoutePayload>({
    mutationFn: createAdminRouteApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-routes"] });
    },
  });
}

export function useUpdateAdminRoute() {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    ApiError,
    { routeId: number; payload: AdminRoutePayload }
  >({
    mutationFn: ({ routeId, payload }) => updateAdminRouteApi(routeId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-routes"] });
    },
  });
}

export function useUpdateAdminRouteStatus() {
  const queryClient = useQueryClient();

  return useMutation<
    any,
    ApiError,
    { routeId: number; status: "ACTIVE" | "SUSPENDED"; reason: string }
  >({
    mutationFn: ({ routeId, status, reason }) =>
      updateAdminRouteStatusApi(routeId, { status, reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-routes"] });
    },
  });
}

export function useDuplicateReverseRoute() {
  const queryClient = useQueryClient();

  return useMutation<any, ApiError, number>({
    mutationFn: duplicateReverseRouteApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-routes"] });
    },
  });
}
