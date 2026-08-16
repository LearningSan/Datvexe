import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createAdminVehicleApi,
  fetchAdminVehicleOptions,
  fetchAdminVehicles,
  updateAdminVehicleApi,
  updateAdminVehicleStatusApi,
} from "@/services/admin/vehicle.service";

import type {
  AdminVehicleListParams,
  CreateAdminVehiclePayload,
  UpdateAdminVehiclePayload,
  UpdateVehicleStatusPayload,
} from "@/types/admin/vehicles/vehicle-management.type";

/**
 * =========================================================
 * DANH SÁCH XE
 * =========================================================
 */
export function useVehicles(params: AdminVehicleListParams) {
  return useQuery({
    queryKey: ["admin-vehicles", params],
    queryFn: () => fetchAdminVehicles(params),
  });
}

/**
 * =========================================================
 * OPTIONS
 * =========================================================
 *
 * Dùng cho:
 * - Loại xe
 * - Sơ đồ ghế
 */
export function useVehicleOptions() {
  return useQuery({
    queryKey: ["admin-vehicle-options"],
    queryFn: fetchAdminVehicleOptions,
  });
}

/**
 * =========================================================
 * THÊM XE
 * =========================================================
 */
export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAdminVehiclePayload) =>
      createAdminVehicleApi(payload),

    onSuccess: () => {
      // Refresh danh sách xe
      queryClient.invalidateQueries({
        queryKey: ["admin-vehicles"],
      });

      // Refresh options nếu cần
      queryClient.invalidateQueries({
        queryKey: ["admin-vehicle-options"],
      });
    },
  });
}

/**
 * =========================================================
 * CẬP NHẬT XE
 * =========================================================
 */
export function useUpdateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      vehicleId,
      payload,
    }: {
      vehicleId: number;
      payload: UpdateAdminVehiclePayload;
    }) => updateAdminVehicleApi(vehicleId, payload),

    onSuccess: () => {
      // Refresh danh sách xe
      queryClient.invalidateQueries({
        queryKey: ["admin-vehicles"],
      });

      // Refresh options
      queryClient.invalidateQueries({
        queryKey: ["admin-vehicle-options"],
      });
    },
  });
}

/**
 * =========================================================
 * CẬP NHẬT TRẠNG THÁI XE
 * =========================================================
 */
export function useUpdateVehicleStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      vehicleId,
      payload,
    }: {
      vehicleId: number;
      payload: UpdateVehicleStatusPayload;
    }) => updateAdminVehicleStatusApi(vehicleId, payload),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["admin-vehicles"],
      });
    },
  });
}
