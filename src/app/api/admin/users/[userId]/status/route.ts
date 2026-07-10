import { NextRequest } from "next/server";

import { updateAdminUserStatus } from "@/services/server/admin/admin-user.service";
import { updateAdminUserStatusSchema } from "@/validators/admin/user.validator";
import { successResponse, errorResponse } from "@/lib/server/response";

interface Context {
  params: Promise<{
    userId: string;
  }>;
}

function getZodMessage(error: any, fallback: string) {
  return error?.issues?.[0]?.message || error?.errors?.[0]?.message || fallback;
}

function parseUserId(value: string) {
  const userId = Number(value);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("userId không hợp lệ");
  }

  return userId;
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const params = await context.params;
    const userId = parseUserId(params.userId);

    const body = await req.json();
    const parsed = updateAdminUserStatusSchema.parse(body);

    const data = await updateAdminUserStatus(userId, parsed.status);

    return successResponse(data, "Cập nhật trạng thái tài khoản thành công");
  } catch (error: any) {
    console.error("[UPDATE USER STATUS ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(
        getZodMessage(error, "Trạng thái tài khoản không hợp lệ"),
        null,
        400,
      );
    }

    return errorResponse(
      error.message || "Không thể cập nhật trạng thái",
      null,
      error.message === "userId không hợp lệ" ? 400 : 500,
    );
  }
}
