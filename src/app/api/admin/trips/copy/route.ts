import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { copyAdminTrips } from "@/services/server/admin/admin-trip.service";

import { copyTripsSchema } from "@/validators/admin/trip.validator";

export async function POST(req: NextRequest) {
  try {
     await getAdminAuthUserId(req);

    const body = await req.json();
    const parsed = copyTripsSchema.parse(body);

    const data = await copyAdminTrips(parsed);

    return successResponse(data, "Sao chép lịch chuyến thành công");
  } catch (error: unknown) {
    console.error("[COPY ADMIN TRIPS ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể sao chép lịch chuyến";

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
