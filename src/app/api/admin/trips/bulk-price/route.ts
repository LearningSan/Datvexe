import { NextRequest } from "next/server";

import { bulkUpdateAdminTripPrice } from "@/services/server/admin/admin-trip.service";
import { bulkUpdateTripPriceSchema } from "@/validators/admin/trip.validator";

import { successResponse, errorResponse } from "@/lib/server/response";

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = bulkUpdateTripPriceSchema.parse(body);

    const data = await bulkUpdateAdminTripPrice(parsed);

    return successResponse(data, "Cập nhật giá hàng loạt thành công");
  } catch (error: any) {
    console.error("[BULK UPDATE TRIP PRICE ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(
      error.message || "Không thể cập nhật giá hàng loạt",
      null,
      500,
    );
  }
}
