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

export function useVehicles(params: AdminVehicleListParams) {
  return useQuery({
    queryKey: ["admin-vehicles", params],
    queryFn: () => fetchAdminVehicles(params),
  });
}

export function useVehicleOptions() {
  return useQuery({
    queryKey: ["admin-vehicle-options"],
    queryFn: fetchAdminVehicleOptions,
  });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAdminVehiclePayload) =>
      createAdminVehicleApi(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-vehicle-options"] });
    },
  });
}

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
      queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["admin-vehicle-options"] });
    },
  });
}

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
      queryClient.invalidateQueries({ queryKey: ["admin-vehicles"] });
    },
  });
}
