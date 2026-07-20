import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { updateAdminTripStatus } from "@/services/server/admin/admin-trip.service";

import {
  tripIdParamsSchema,
  updateTripStatusSchema,
} from "@/validators/admin/trip.validator";

interface Context {
  params: Promise<{
    tripId: string;
  }>;
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
   await getAdminAuthUserId(req);

    const params = await context.params;
    const body = await req.json();

    const parsedParams = tripIdParamsSchema.parse(params);
    const parsedBody = updateTripStatusSchema.parse(body);

    const data = await updateAdminTripStatus(
      parsedParams.tripId,
      parsedBody.status,
      parsedBody.reason,
     
    );

    return successResponse(data, "Cập nhật trạng thái chuyến xe thành công");
  } catch (error: unknown) {
    console.error("[UPDATE ADMIN TRIP STATUS ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể cập nhật trạng thái chuyến xe";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Dữ liệu JSON không hợp lệ", null, 400);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(message, null, 400);
    }

    if (message === "Không tìm thấy chuyến xe") {
      return errorResponse(message, null, 404);
    }

    return errorResponse(message, null, 500);
  }
}
