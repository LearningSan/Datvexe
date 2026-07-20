// src/app/api/admin/dashboard/route-performance/route.ts

import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { getRoutePerformance } from "@/services/server/client/dashboard.service";

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const { searchParams } = req.nextUrl;

    const originCityId = Number(searchParams.get("originCityId"));
    const destinationCityId = Number(searchParams.get("destinationCityId"));
    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    if (!originCityId || !destinationCityId || !fromDate || !toDate) {
      return errorResponse("Thiếu bộ lọc tuyến hoặc thời gian", null, 400);
    }

    if (originCityId === destinationCityId) {
      return errorResponse(
        "Điểm đi và điểm đến không được trùng nhau",
        null,
        400,
      );
    }

    const data = await getRoutePerformance({
      originCityId,
      destinationCityId,
      fromDate,
      toDate,
    });

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ROUTE PERFORMANCE ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể tải hiệu suất tuyến";

    return errorResponse(
      message === "UNAUTHORIZED"
        ? "Phiên đăng nhập quản trị không hợp lệ"
        : message,
      null,
      message === "UNAUTHORIZED" ? 401 : 500,
    );
  }
}
