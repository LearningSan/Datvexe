import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { errorResponse, successResponse } from "@/lib/server/response";

import { confirmCheckinSchema } from "@/validators/admin/checkin.validator";

import { confirmAdminCheckin } from "@/services/server/admin/checkin/admin-checkin.service";

export async function POST(request: NextRequest) {
  try {
    const adminUserId = await getAdminAuthUserId(request);

    const payload = confirmCheckinSchema.parse(await request.json());

    const result = await confirmAdminCheckin({
      ...payload,
      checkedInBy: adminUserId,
    });

    return successResponse(
      result,
      result.checkedInCount > 0
        ? `Check-in thành công ${result.checkedInCount} ghế`
        : "Các ghế đã được check-in trước đó",
    );
  } catch (error: unknown) {
    console.error("[ADMIN CHECKIN CONFIRM ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể xác nhận check-in";

    return errorResponse(
      message === "UNAUTHORIZED"
        ? "Phiên đăng nhập quản trị không hợp lệ"
        : message,
      null,
      message === "UNAUTHORIZED" ? 401 : 400,
    );
  }
}
