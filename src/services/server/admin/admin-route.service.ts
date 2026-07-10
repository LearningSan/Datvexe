import {
  createAdminRouteRepo,
  createRouteChangeLog,
  duplicateReverseRouteRepo,
  findAdminRouteById,
  findAdminRouteOptions,
  findAdminRoutes,
  updateAdminRouteRepo,
  updateAdminRouteStatusRepo,
} from "@/repositories/admin/route.repo";

import type {
  AdminRouteListParams,
  AdminRoutePayload,
} from "@/types/admin/routes/route-management.type";

export async function getAdminRoutes(params: AdminRouteListParams) {
  return await findAdminRoutes(params);
}

export async function getAdminRouteOptions() {
  return await findAdminRouteOptions();
}

export async function createAdminRoute(
  data: AdminRoutePayload,
  changedBy?: number | null,
) {
  const result = await createAdminRouteRepo(data);

  await createRouteChangeLog({
    routeId: result.routeId,
    changedBy: changedBy ?? null,
    actionType: "CREATE",
    reason: data.reason ?? "Tạo tuyến xe mới",
    oldData: null,
    newData: data,
  });

  return result;
}

export async function updateAdminRoute(
  routeId: number,
  data: AdminRoutePayload,
  changedBy?: number | null,
) {
  const existing = await findAdminRouteById(routeId);

  if (!existing) {
    throw new Error("Tuyến xe không tồn tại");
  }

  const result = await updateAdminRouteRepo(routeId, data, existing.hasTrips);

  await createRouteChangeLog({
    routeId,
    changedBy: changedBy ?? null,
    actionType: "UPDATE",
    reason: data.reason,
    oldData: existing,
    newData: data,
  });

  return result;
}

export async function updateAdminRouteStatus(
  routeId: number,
  data: {
    status: "ACTIVE" | "SUSPENDED";
    reason: string;
  },
  changedBy?: number | null,
) {
  const existing = await findAdminRouteById(routeId);

  if (!existing) {
    throw new Error("Tuyến xe không tồn tại");
  }

  const result = await updateAdminRouteStatusRepo(routeId, data.status);

  await createRouteChangeLog({
    routeId,
    changedBy: changedBy ?? null,
    actionType: data.status === "SUSPENDED" ? "SUSPEND" : "ACTIVATE",
    reason: data.reason,
    oldData: {
      status: existing.status,
    },
    newData: {
      status: data.status,
    },
  });

  return result;
}

export async function duplicateReverseRoute(
  routeId: number,
  changedBy?: number | null,
) {
  const existing = await findAdminRouteById(routeId);

  if (!existing) {
    throw new Error("Tuyến xe không tồn tại");
  }

  const result = await duplicateReverseRouteRepo(routeId);

  await createRouteChangeLog({
    routeId: result.routeId,
    changedBy: changedBy ?? null,
    actionType: "REVERSE_CREATE",
    reason: "Tạo tuyến chiều ngược lại",
    oldData: existing,
    newData: result,
  });

  return result;
}
