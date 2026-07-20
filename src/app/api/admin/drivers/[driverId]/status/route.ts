import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { updateAdminDriverStatus } from "@/services/server/admin/admin-driver.service";

import { updateAdminDriverStatusSchema } from "@/validators/admin/driver.validator";

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
    const parsed = updateAdminDriverStatusSchema.parse(body);

    const data = await updateAdminDriverStatus(driverId, parsed.status);

    return successResponse(data, "Cập nhật trạng thái tài xế thành công");
  } catch (error: unknown) {
    console.error("[UPDATE DRIVER STATUS ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể cập nhật trạng thái";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(message, null, 400);
    }

    return errorResponse(
      message,
      null,
      message === "driverId không hợp lệ" ? 400 : 500,
    );
  }
}
