import { NextRequest } from "next/server";

import { updateAdminTrip } from "@/services/server/admin/admin-trip.service";

import {
  tripIdParamsSchema,
  updateAdminTripSchema,
} from "@/validators/admin/trip.validator";

import { successResponse, errorResponse } from "@/lib/server/response";

interface Context {
  params: Promise<{
    tripId: string;
  }>;
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const params = await context.params;
    const body = await req.json();

    const parsedParams = tripIdParamsSchema.parse(params);
    const parsedBody = updateAdminTripSchema.parse(body);

    const data = await updateAdminTrip(parsedParams.tripId, parsedBody);

    return successResponse(data, "Cập nhật chuyến xe thành công");
  } catch (error: any) {
    console.error("[UPDATE ADMIN TRIP ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(
      error.message || "Không thể cập nhật chuyến xe",
      null,
      500,
    );
  }
}
