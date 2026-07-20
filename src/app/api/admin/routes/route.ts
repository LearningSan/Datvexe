import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import {
  createAdminRoute,
  getAdminRoutes,
} from "@/services/server/admin/admin-route.service";

import {
  adminRouteListQuerySchema,
  createAdminRouteSchema,
} from "@/validators/admin/route.validator";

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = adminRouteListQuerySchema.parse(searchParams);

    const data = await getAdminRoutes(parsed);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN ROUTES LIST ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể lấy danh sách tuyến xe";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(
        message || "Dữ liệu lọc tuyến xe không hợp lệ",
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
    const parsed = createAdminRouteSchema.parse(body);

    const data = await createAdminRoute(parsed);

    return successResponse(data, "Tạo tuyến xe thành công");
  } catch (error: unknown) {
    console.error("[CREATE ADMIN ROUTE ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể tạo tuyến xe";

    const errorCode =
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      typeof error.code === "string"
        ? error.code
        : null;

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Dữ liệu JSON không hợp lệ", null, 400);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(
        message || "Dữ liệu tuyến xe không hợp lệ",
        null,
        400,
      );
    }

    if (
      errorCode === "ER_DUP_ENTRY" ||
      message.includes("Duplicate entry") ||
      message === "Tuyến xe với điểm đi và điểm đến này đã tồn tại"
    ) {
      return errorResponse(
        "Tuyến xe với điểm đi và điểm đến này đã tồn tại",
        null,
        409,
      );
    }

    return errorResponse(message, null, 500);
  }
}
