import { NextRequest } from "next/server";

import { ZodError } from "zod";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import {
  tripCheckinPassengersParamsSchema,
  tripCheckinPassengersQuerySchema,
} from "@/validators/admin/checkin-query.validator";

import { getTripCheckinPassengers } from "@/services/server/admin/checkin/admin-checkin-query.service";

interface RouteContext {
  params: Promise<{
    tripId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await getAdminAuthUserId(request);

    const params = await context.params;

    const parsedParams = tripCheckinPassengersParamsSchema.parse(params);

    const parsedQuery = tripCheckinPassengersQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    const data = await getTripCheckinPassengers({
      tripId: parsedParams.tripId,
      filter: parsedQuery.filter,
      keyword: parsedQuery.keyword,
    });

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[GET TRIP CHECKIN PASSENGERS ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể lấy danh sách hành khách";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof ZodError) {
      return errorResponse(
        "Dữ liệu truy vấn không hợp lệ",
        error.flatten(),
        400,
      );
    }

    if (message === "Không tìm thấy chuyến xe") {
      return errorResponse(message, null, 404);
    }

    return errorResponse(message, null, 500);
  }
}
