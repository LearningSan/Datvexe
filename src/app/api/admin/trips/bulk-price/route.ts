import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { bulkUpdateAdminTripPrice } from "@/services/server/admin/admin-trip.service";

import { bulkUpdateTripPriceSchema } from "@/validators/admin/trip.validator";

export async function PATCH(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const body = await req.json();
    const parsed = bulkUpdateTripPriceSchema.parse(body);

    const data = await bulkUpdateAdminTripPrice(parsed);

    return successResponse(data, "Cập nhật giá hàng loạt thành công");
  } catch (error: unknown) {
    console.error("[BULK UPDATE TRIP PRICE ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể cập nhật giá hàng loạt";

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
