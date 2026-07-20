import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { updateAdminPickupPointStatus } from "@/services/server/admin/admin-pickup-point.service";

import {
  pickupPointIdParamsSchema,
  updatePickupPointStatusSchema,
} from "@/validators/admin/pickup-point.validator";

interface Context {
  params: Promise<{
    pickupPointId: string;
  }>;
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(req);

    const params = await context.params;
    const body = await req.json();

    const parsedParams = pickupPointIdParamsSchema.parse(params);
    const parsedBody = updatePickupPointStatusSchema.parse(body);

    const data = await updateAdminPickupPointStatus(
      parsedParams.pickupPointId,
      parsedBody.isActive,
    );

    return successResponse(data, "Cập nhật trạng thái điểm thành công");
  } catch (error: unknown) {
    console.error("[UPDATE PICKUP POINT STATUS ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể cập nhật trạng thái điểm";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(message, null, 400);
    }

    return errorResponse(message, null, 500);
  }
}
