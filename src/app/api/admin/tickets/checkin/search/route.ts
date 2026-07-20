import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { releaseExpiredTicketHolds } from "@/services/server/admin/admin-ticket.service";

export async function POST(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const data = await releaseExpiredTicketHolds();

    return successResponse(data, "Đã giải phóng giữ chỗ hết hạn");
  } catch (error: unknown) {
    console.error("[ADMIN RELEASE EXPIRED TICKET HOLDS ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể giải phóng giữ chỗ hết hạn";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    return errorResponse(message, null, 500);
  }
}
