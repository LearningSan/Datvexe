import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { updateAdminTrip } from "@/services/server/admin/admin-trip.service";

import {
  tripIdParamsSchema,
  updateAdminTripSchema,
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
    const parsedBody = updateAdminTripSchema.parse(body);

    const data = await updateAdminTrip(
      parsedParams.tripId,
      parsedBody,
    
    );

    return successResponse(data, "Cập nhật chuyến xe thành công");
  } catch (error: unknown) {
    console.error("[UPDATE ADMIN TRIP ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể cập nhật chuyến xe";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Dữ liệu JSON không hợp lệ", null, 400);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(message, null, 400);
    }

    return errorResponse(message, null, 500);
  }
}
