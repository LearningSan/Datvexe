import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import {
  createAdminScheduleTemplate,
  getAdminScheduleTemplates,
} from "@/services/server/admin/admin-schedule.service";

import {
  adminScheduleTemplateListQuerySchema,
  createAdminScheduleTemplateSchema,
} from "@/validators/admin/schedule.validator";

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = adminScheduleTemplateListQuerySchema.parse(searchParams);

    const data = await getAdminScheduleTemplates(parsed);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN SCHEDULE LIST ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể lấy danh sách lịch chạy";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(
        message || "Dữ liệu lọc lịch chạy không hợp lệ",
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
    const parsed = createAdminScheduleTemplateSchema.parse(body);

    const data = await createAdminScheduleTemplate(parsed);

    return successResponse(data, "Tạo lịch chạy mẫu thành công");
  } catch (error: unknown) {
    console.error("[CREATE ADMIN SCHEDULE ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể tạo lịch chạy mẫu";

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
