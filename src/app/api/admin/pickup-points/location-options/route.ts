import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { getAdminLocationOptions } from "@/services/server/admin/admin-pickup-point.service";

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const cityIdParam = req.nextUrl.searchParams.get("cityId");

    const cityId = cityIdParam ? Number(cityIdParam) : undefined;

    if (cityId !== undefined && (!Number.isInteger(cityId) || cityId <= 0)) {
      return errorResponse("cityId không hợp lệ", null, 400);
    }

    const data = await getAdminLocationOptions(cityId);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN LOCATION OPTIONS ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể lấy danh sách thành phố/khu vực";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    return errorResponse(message, null, 500);
  }
}
