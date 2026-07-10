import {
  countVehicleUsage,
  createVehicleRepo,
  findAdminVehicles,
  findVehicleById,
  findVehicleOptions,
  hasRunningTrip,
  updateVehicleRepo,
  updateVehicleStatusRepo,
} from "@/repositories/admin/vehicle.repo";

import type {
  AdminVehicleListParams,
  CreateAdminVehiclePayload,
  UpdateAdminVehiclePayload,
  VehicleStatus,
} from "@/types/admin/vehicles/vehicle-management.type";

export async function getAdminVehicles(params: AdminVehicleListParams) {
  return await findAdminVehicles(params);
}

export async function getAdminVehicleOptions() {
  return await findVehicleOptions();
}

export async function createAdminVehicle(payload: CreateAdminVehiclePayload) {
  return await createVehicleRepo(payload);
}

export async function updateAdminVehicle(
  vehicleId: number,
  payload: UpdateAdminVehiclePayload,
) {
  const vehicle = await findVehicleById(vehicleId);
  if (!vehicle) throw new Error("Không tìm thấy xe");

  if (payload.status === "MAINTENANCE") {
    const running = await hasRunningTrip(vehicleId);
    if (running) {
      throw new Error(
        "Không thể đưa xe vào bảo trì vì xe đang có chuyến RUNNING",
      );
    }
  }

  const usage = await countVehicleUsage(vehicleId);
  const isLocked = usage.tripCount > 0 || usage.bookingCount > 0;

  return await updateVehicleRepo(vehicleId, payload, isLocked);
}

export async function updateAdminVehicleStatus(
  vehicleId: number,
  status: VehicleStatus,
) {
  if (status === "MAINTENANCE") {
    const running = await hasRunningTrip(vehicleId);
    if (running) {
      throw new Error(
        "Không thể đưa xe vào bảo trì vì xe đang có chuyến RUNNING",
      );
    }
  }

  return await updateVehicleStatusRepo(vehicleId, status);
}
