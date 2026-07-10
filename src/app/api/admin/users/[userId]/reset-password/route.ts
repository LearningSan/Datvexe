import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";
import { resetAdminUserPassword } from "@/services/server/admin/admin-user.service";

interface Context {
  params: Promise<{ userId: string }>;
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
    const newPassword = String(body?.newPassword || "");

    const data = await resetAdminUserPassword(userId, newPassword);

    return successResponse(data, "Reset mật khẩu thành công");
  } catch (error: any) {
    console.error("[RESET USER PASSWORD ERROR]", error);

    return errorResponse(
      error.message || "Không thể reset mật khẩu",
      null,
      error.message === "userId không hợp lệ" ? 400 : 500,
    );
  }
}
