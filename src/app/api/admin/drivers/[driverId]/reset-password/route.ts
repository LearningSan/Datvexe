import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { resetAdminDriverPassword } from "@/services/server/admin/admin-driver.service";

interface Context {
  params: Promise<{
    driverId: string;
  }>;
}

function parseDriverId(value: string) {
  const driverId = Number(value);

  if (!Number.isInteger(driverId) || driverId <= 0) {
    throw new Error("driverId không hợp lệ");
  }

  return driverId;
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(req);

    const params = await context.params;
    const driverId = parseDriverId(params.driverId);

    const body = await req.json();
    const newPassword = String(body?.newPassword || "");

    const data = await resetAdminDriverPassword(driverId, newPassword);

    return successResponse(data, "Reset mật khẩu tài xế thành công");
  } catch (error: unknown) {
    console.error("[RESET DRIVER PASSWORD ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể reset mật khẩu tài xế";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    return errorResponse(
      message,
      null,
      message === "driverId không hợp lệ" ? 400 : 500,
    );
  }
}
