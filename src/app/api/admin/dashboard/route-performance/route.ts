// src/app/api/admin/dashboard/route-performance/route.ts
import { NextRequest } from "next/server";
import { getRoutePerformance } from "@/services/server/client/dashboard.service";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

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
  } catch (error: any) {
    console.error("[ROUTE PERFORMANCE ERROR]", error);

    return errorResponse(
      error.message || "Không thể tải hiệu suất tuyến",
      null,
      500,
    );
  }
}
