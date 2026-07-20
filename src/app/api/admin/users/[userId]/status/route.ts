import { NextRequest } from "next/server";

import { ZodError } from "zod";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { updateAdminUserStatus } from "@/services/server/admin/admin-user.service";
import { updateAdminUserStatusSchema } from "@/validators/admin/user.validator";

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
    const parsed = updateAdminUserStatusSchema.parse(body);

    const data = await updateAdminUserStatus(
      userId,
      parsed.status,
   
    );

    return successResponse(data, "Cập nhật trạng thái tài khoản thành công");
  } catch (error: unknown) {
    console.error("[UPDATE USER STATUS ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể cập nhật trạng thái";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Dữ liệu JSON không hợp lệ", null, 400);
    }

    if (error instanceof ZodError) {
      return errorResponse(
        error.issues[0]?.message || "Trạng thái tài khoản không hợp lệ",
        null,
        400,
      );
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
