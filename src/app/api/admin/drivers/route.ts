import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import {
  getAdminDrivers,
  createAdminDriver,
} from "@/services/server/admin/admin-driver.service";

import {
  adminDriverListQuerySchema,
  createAdminDriverSchema,
} from "@/validators/admin/driver.validator";

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const searchParams = Object.fromEntries(req.nextUrl.searchParams);

    const parsed = adminDriverListQuerySchema.parse(searchParams);

    const data = await getAdminDrivers(parsed);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN DRIVERS LIST ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể lấy danh sách tài xế";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(
        message || "Dữ liệu lọc tài xế không hợp lệ",
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

    const parsed = createAdminDriverSchema.parse(body);

    const data = await createAdminDriver(parsed);

    return successResponse(data, "Tạo tài xế thành công");
  } catch (error: unknown) {
    console.error("[CREATE ADMIN DRIVER ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể tạo tài xế";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(message, null, 400);
    }

    return errorResponse(message, null, 500);
  }
}
