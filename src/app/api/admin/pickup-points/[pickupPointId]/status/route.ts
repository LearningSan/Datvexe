import { NextRequest } from "next/server";

import { updateAdminPickupPointStatus } from "@/services/server/admin/admin-pickup-point.service";

import {
  pickupPointIdParamsSchema,
  updatePickupPointStatusSchema,
} from "@/validators/admin/pickup-point.validator";

import { successResponse, errorResponse } from "@/lib/server/response";

interface Context {
  params: Promise<{
    pickupPointId: string;
  }>;
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const params = await context.params;
    const body = await req.json();

    const parsedParams = pickupPointIdParamsSchema.parse(params);
    const parsedBody = updatePickupPointStatusSchema.parse(body);

    const data = await updateAdminPickupPointStatus(
      parsedParams.pickupPointId,
      parsedBody.isActive,
    );

    return successResponse(data, "Cập nhật trạng thái điểm thành công");
  } catch (error: any) {
    console.error("[UPDATE PICKUP POINT STATUS ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(
      error.message || "Không thể cập nhật trạng thái điểm",
      null,
      500,
    );
  }
}
