import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { searchAdminNotificationRecipients } from "@/services/server/admin/admin-notification.service";

import { notificationRecipientSearchSchema } from "@/validators/admin/notification.validator";

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const searchParams = Object.fromEntries(req.nextUrl.searchParams);

    const parsed = notificationRecipientSearchSchema.parse(searchParams);

    const data = await searchAdminNotificationRecipients(parsed.keyword);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN NOTIFICATION RECIPIENT SEARCH ERROR]", error);

    if (error instanceof ZodError) {
      return errorResponse(
        error.issues[0]?.message || "Dữ liệu tìm kiếm không hợp lệ",
        null,
        400,
      );
    }

    const message =
      error instanceof Error ? error.message : "Không thể tìm người nhận";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    return errorResponse(message, null, 500);
  }
}
