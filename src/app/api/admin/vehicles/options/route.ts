import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { getAdminVehicleOptions } from "@/services/server/admin/admin-vehicle.service";

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const data = await getAdminVehicleOptions();

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN VEHICLE OPTIONS ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể lấy dữ liệu xe";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    return errorResponse(message, null, 500);
  }
}
