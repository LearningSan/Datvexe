import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/server/response";

import { lookupCheckinQrSchema } from "@/validators/admin/checkin.validator";

import { lookupAdminCheckinQr } from "@/services/server/admin/checkin/admin-checkin.service";
import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
export async function POST(request: NextRequest) {
  try {
    await getAdminAuthUserId(request);
    const payload = lookupCheckinQrSchema.parse(await request.json());

    const result = await lookupAdminCheckinQr(payload);

    return successResponse(result);
  } catch (error: unknown) {
    console.error("[ADMIN CHECKIN LOOKUP ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể kiểm tra mã QR";
    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }
    return errorResponse(
      message,
      null,
      message.includes("Không tìm thấy") ? 404 : 400,
    );
  }
}
