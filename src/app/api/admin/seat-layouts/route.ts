import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { getAdminSeatLayouts } from "@/services/server/admin/admin-seat-layout.service";

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const data = await getAdminSeatLayouts();

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN SEAT LAYOUT LIST ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể lấy danh sách sơ đồ ghế";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    return errorResponse(message, null, 500);
  }
}
