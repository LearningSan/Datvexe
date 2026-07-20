import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { getAdminScheduleOptions } from "@/services/server/admin/admin-schedule.service";

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const data = await getAdminScheduleOptions();

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN SCHEDULE OPTIONS ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể lấy dữ liệu tuyến xe";

    return errorResponse(
      message === "UNAUTHORIZED"
        ? "Phiên đăng nhập quản trị không hợp lệ"
        : message,
      null,
      message === "UNAUTHORIZED" ? 401 : 500,
    );
  }
}
