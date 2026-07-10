import {
  checkPickupPointUsed,
  createPickupPointRepo,
  findAdminPickupPoints,
  findLinkedRoutesByPickupPoint,
  findPickupPointById,
  updatePickupPointRepo,
  updatePickupPointSafeRepo,
  updatePickupPointStatusRepo,
  findAdminCityOptions,
  findAdminZoneOptions,
} from "@/repositories/admin/pickup-point.repo";

import type {
  AdminPickupPointListParams,
  CreateAdminPickupPointPayload,
  UpdateAdminPickupPointPayload,
} from "@/types/admin/pickup-points/pickup-point-management.type";

export async function getAdminLocationOptions(cityId?: number) {
  const [cities, zones] = await Promise.all([
    findAdminCityOptions(),
    findAdminZoneOptions(cityId),
  ]);

  return {
    cities,
    zones,
  };
}
export async function getAdminPickupPoints(params: AdminPickupPointListParams) {
  return await findAdminPickupPoints(params);
}

export async function getAdminPickupPointDetail(pickupPointId: number) {
  const point = await findPickupPointById(pickupPointId);

  if (!point) {
    throw new Error("Điểm đón trả không tồn tại");
  }

  const usage = await checkPickupPointUsed(pickupPointId);
  const linkedRoutes = await findLinkedRoutesByPickupPoint(pickupPointId);

  return {
    ...point,
    canEditLocation: !usage.isUsed,
    canEditCategory: !usage.isUsed,
    linkedRoutes,
  };
}

export async function createAdminPickupPoint(
  data: CreateAdminPickupPointPayload,
) {
  if (data.latitude && (data.latitude < -90 || data.latitude > 90)) {
    throw new Error("Vĩ độ không hợp lệ");
  }

  if (data.longitude && (data.longitude < -180 || data.longitude > 180)) {
    throw new Error("Kinh độ không hợp lệ");
  }

  return await createPickupPointRepo(data);
}

export async function updateAdminPickupPoint(
  pickupPointId: number,
  data: UpdateAdminPickupPointPayload,
) {
  const existing = await findPickupPointById(pickupPointId);

  if (!existing) {
    throw new Error("Điểm đón trả không tồn tại");
  }

  const usage = await checkPickupPointUsed(pickupPointId);

  if (usage.isUsed) {
    const changedCity = Number(existing.cityId) !== Number(data.cityId);
    const changedZone = Number(existing.zoneId) !== Number(data.zoneId);
    const changedCategory = existing.pointCategory !== data.pointCategory;
    const changedLatitude =
      Number(existing.latitude ?? 0) !== Number(data.latitude ?? 0);
    const changedLongitude =
      Number(existing.longitude ?? 0) !== Number(data.longitude ?? 0);

    if (
      changedCity ||
      changedZone ||
      changedCategory ||
      changedLatitude ||
      changedLongitude
    ) {
      throw new Error(
        "Điểm này đã được dùng trong chuyến hoặc booking, chỉ được sửa tên hiển thị và địa chỉ",
      );
    }

    return await updatePickupPointSafeRepo(pickupPointId, {
      pointName: data.pointName,
      address: data.address,
    });
  }

  return await updatePickupPointRepo(pickupPointId, data);
}

export async function updateAdminPickupPointStatus(
  pickupPointId: number,
  isActive: boolean,
) {
  const existing = await findPickupPointById(pickupPointId);

  if (!existing) {
    throw new Error("Điểm đón trả không tồn tại");
  }

  return await updatePickupPointStatusRepo(pickupPointId, isActive);
}

export async function deleteAdminPickupPoint(pickupPointId: number) {
  const existing = await findPickupPointById(pickupPointId);

  if (!existing) {
    throw new Error("Điểm đón trả không tồn tại");
  }

  return await updatePickupPointStatusRepo(pickupPointId, false);
}
