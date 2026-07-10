import { NextRequest } from "next/server";

import {
  createAdminPickupPoint,
  getAdminPickupPoints,
} from "@/services/server/admin/admin-pickup-point.service";

import {
  adminPickupPointListQuerySchema,
  createAdminPickupPointSchema,
} from "@/validators/admin/pickup-point.validator";

import { successResponse, errorResponse } from "@/lib/server/response";

export async function GET(req: NextRequest) {
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);

    const parsed = adminPickupPointListQuerySchema.parse(searchParams);

    const data = await getAdminPickupPoints(parsed);

    return successResponse(data);
  } catch (error: any) {
    console.error("[ADMIN PICKUP POINT LIST ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(
        error.errors?.[0]?.message || "Dữ liệu lọc điểm đón trả không hợp lệ",
        null,
        400,
      );
    }

    return errorResponse(
      error.message || "Không thể lấy danh sách điểm đón trả",
      null,
      500,
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const parsed = createAdminPickupPointSchema.parse(body);

    const data = await createAdminPickupPoint(parsed);

    return successResponse(data, "Tạo điểm đón trả thành công");
  } catch (error: any) {
    console.error("[CREATE ADMIN PICKUP POINT ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(
      error.message || "Không thể tạo điểm đón trả",
      null,
      500,
    );
  }
}
