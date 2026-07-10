import { NextRequest } from "next/server";

import { getAdminLocationOptions } from "@/services/server/admin/admin-pickup-point.service";

import { successResponse, errorResponse } from "@/lib/server/response";

export async function GET(req: NextRequest) {
  try {
    const cityIdParam = req.nextUrl.searchParams.get("cityId");

    const cityId = cityIdParam ? Number(cityIdParam) : undefined;

    const data = await getAdminLocationOptions(cityId);

    return successResponse(data);
  } catch (error: any) {
    console.error("[ADMIN LOCATION OPTIONS ERROR]", error);

    return errorResponse(
      error.message || "Không thể lấy danh sách thành phố/khu vực",
      null,
      500,
    );
  }
}
