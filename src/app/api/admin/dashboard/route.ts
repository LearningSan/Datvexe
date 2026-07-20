import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { getDashboardData } from "@/services/server/client/dashboard.service";

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const { searchParams } = req.nextUrl;

    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    if (!fromDate || !toDate) {
      return errorResponse("Thiếu fromDate hoặc toDate", null, 400);
    }

    const data = await getDashboardData({
      fromDate,
      toDate,
    });

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN DASHBOARD ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể tải dữ liệu dashboard";

    return errorResponse(
      message === "UNAUTHORIZED"
        ? "Phiên đăng nhập quản trị không hợp lệ"
        : message,
      null,
      message === "UNAUTHORIZED" ? 401 : 500,
    );
  }
}
