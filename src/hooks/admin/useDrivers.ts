import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdminDriverApi,
  fetchAdminDrivers,
  updateAdminDriverApi,
  updateAdminDriverStatusApi,
  deleteAdminDriverApi,
  fetchAdminDriverDetail,
  resetAdminDriverPasswordApi,
} from "@/services/admin/driver.service";
import type { AdminDriverListParams } from "@/types/admin/drivers/driver-management.type";

interface ApiError {
  message?: string;
}

export function useDrivers(params: AdminDriverListParams) {
  return useQuery({
    queryKey: ["admin-drivers", params],
    queryFn: () => fetchAdminDrivers(params),
    staleTime: 1000 * 60,
    retry: 1,
  });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  return useMutation<any, ApiError, any>({
    mutationFn: createAdminDriverApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });
    },
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();
  return useMutation<
    any,
    ApiError,
    {
      driverId: number;
      payload: {
        fullName: string;
        email?: string | null;
        phone?: string | null;
        driverType: "BUS" | "SHUTTLE" | "BOTH";
        licenseNumber: string;
        hiredDate?: string | null;
      };
    }
  >({
    mutationFn: ({ driverId, payload }) =>
      updateAdminDriverApi(driverId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });
    },
  });
}

export function useUpdateDriverStatus() {
  const queryClient = useQueryClient();
  return useMutation<
    any,
    ApiError,
    { driverId: number; status: "AVAILABLE" | "ASSIGNED" | "OFF" }
  >({
    mutationFn: ({ driverId, status }) =>
      updateAdminDriverStatusApi(driverId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });
    },
  });
}

export function useDeleteDriver() {
  const queryClient = useQueryClient();
  return useMutation<any, ApiError, number>({
    mutationFn: deleteAdminDriverApi,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-drivers"] });
    },
  });
}
export function useDriverDetail(driverId?: number | null) {
  return useQuery({
    queryKey: ["admin-driver-detail", driverId],
    queryFn: () => fetchAdminDriverDetail(driverId!),
    enabled: !!driverId,
    staleTime: 1000 * 30,
  });
}

export function useResetDriverPassword() {
  return useMutation<
    any,
    ApiError,
    {
      driverId: number;
      newPassword: string;
    }
  >({
    mutationFn: ({ driverId, newPassword }) =>
      resetAdminDriverPasswordApi(driverId, { newPassword }),
  });
}