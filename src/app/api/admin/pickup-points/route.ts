import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import {
  createAdminPickupPoint,
  getAdminPickupPoints,
} from "@/services/server/admin/admin-pickup-point.service";

import {
  adminPickupPointListQuerySchema,
  createAdminPickupPointSchema,
} from "@/validators/admin/pickup-point.validator";

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const searchParams = Object.fromEntries(req.nextUrl.searchParams);

    const parsed = adminPickupPointListQuerySchema.parse(searchParams);

    const data = await getAdminPickupPoints(parsed);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN PICKUP POINT LIST ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể lấy danh sách điểm đón trả";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(
        message || "Dữ liệu lọc điểm đón trả không hợp lệ",
        null,
        400,
      );
    }

    return errorResponse(message, null, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const body = await req.json();

    const parsed = createAdminPickupPointSchema.parse(body);

    const data = await createAdminPickupPoint(parsed);

    return successResponse(data, "Tạo điểm đón trả thành công");
  } catch (error: unknown) {
    console.error("[CREATE ADMIN PICKUP POINT ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể tạo điểm đón trả";

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
