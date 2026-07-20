import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { getAdminGuestDetail } from "@/services/server/admin/admin-user.service";

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const email = req.nextUrl.searchParams.get("email")?.trim() || null;
    const phone = req.nextUrl.searchParams.get("phone")?.trim() || null;

    if (!email && !phone) {
      return errorResponse(
        "Vui lòng cung cấp email hoặc số điện thoại",
        null,
        400,
      );
    }

    const data = await getAdminGuestDetail({
      email,
      phone,
    });

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[GET ADMIN GUEST DETAIL ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể lấy chi tiết khách vãng lai";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (message === "Không tìm thấy khách vãng lai") {
      return errorResponse(message, null, 404);
    }

    return errorResponse(message, null, 500);
  }
}
