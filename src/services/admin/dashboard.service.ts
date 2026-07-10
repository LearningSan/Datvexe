// src/services/admin/dashboard.service.ts
import api from "@/lib/client/api";
import type { ApiResponse } from "@/types/common/api.type";
import type {
  DashboardData,
  RoutePerformanceData,
} from "@/types/admin/dashboard/dashboard.type";

export async function fetchDashboardData(fromDate: string, toDate: string) {
  const res = await api.get<ApiResponse<DashboardData>>("/admin/dashboard", {
    params: { fromDate, toDate },
  });

  return res.data.data;
}

export async function fetchRoutePerformance(params: {
  originCityId: number;
  destinationCityId: number;
  fromDate: string;
  toDate: string;
}) {
  const res = await api.get<ApiResponse<RoutePerformanceData>>(
    "/admin/dashboard/route-performance",
    { params },
  );

  return res.data.data;
}
