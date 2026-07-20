import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { resetAdminUserPassword } from "@/services/server/admin/admin-user.service";

interface Context {
  params: Promise<{
    userId: string;
  }>;
}

function parseUserId(value: string): number {
  const userId = Number(value);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("userId không hợp lệ");
  }

  return userId;
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
     await getAdminAuthUserId(req);

    const { userId: rawUserId } = await context.params;
    const userId = parseUserId(rawUserId);

    const body = await req.json();

    const newPassword =
      typeof body?.newPassword === "string" ? body.newPassword.trim() : "";

    if (newPassword.length < 6) {
      return errorResponse("Mật khẩu mới phải có ít nhất 6 ký tự", null, 400);
    }

    const data = await resetAdminUserPassword(userId, newPassword);

    return successResponse(data, "Reset mật khẩu thành công");
  } catch (error: unknown) {
    console.error("[RESET USER PASSWORD ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể reset mật khẩu";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Dữ liệu JSON không hợp lệ", null, 400);
    }

    if (message === "Không tìm thấy người dùng") {
      return errorResponse(message, null, 404);
    }

    return errorResponse(
      message,
      null,
      message === "userId không hợp lệ" ? 400 : 500,
    );
  }
}
