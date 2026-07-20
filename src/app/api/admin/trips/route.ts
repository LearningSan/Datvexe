import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import {
  createAdminTrip,
  getAdminTrips,
} from "@/services/server/admin/admin-trip.service";

import {
  adminTripListQuerySchema,
  createAdminTripSchema,
} from "@/validators/admin/trip.validator";

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const searchParams = Object.fromEntries(req.nextUrl.searchParams);

    const parsed = adminTripListQuerySchema.parse(searchParams);

    const data = await getAdminTrips(parsed);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN TRIPS LIST ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể lấy danh sách chuyến xe";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(message, null, 400);
    }

    return errorResponse(message, null, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
     await getAdminAuthUserId(req);

    const body = await req.json();
    const parsed = createAdminTripSchema.parse(body);

    const data = await createAdminTrip(parsed);

    return successResponse(data, "Tạo chuyến xe thành công");
  } catch (error: unknown) {
    console.error("[CREATE ADMIN TRIP ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể tạo chuyến xe";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Dữ liệu JSON không hợp lệ", null, 400);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(message, null, 400);
    }

    return errorResponse(message, null, 500);
  }
}
