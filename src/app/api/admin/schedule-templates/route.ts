import { NextRequest } from "next/server";

import {
  createAdminScheduleTemplate,
  getAdminScheduleTemplates,
} from "@/services/server/admin/admin-schedule.service";

import {
  adminScheduleTemplateListQuerySchema,
  createAdminScheduleTemplateSchema,
} from "@/validators/admin/schedule.validator";

import { successResponse, errorResponse } from "@/lib/server/response";

export async function GET(req: NextRequest) {
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = adminScheduleTemplateListQuerySchema.parse(searchParams);

    const data = await getAdminScheduleTemplates(parsed);

    return successResponse(data);
  } catch (error: any) {
    console.error("[ADMIN SCHEDULE LIST ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(
        error.errors?.[0]?.message || "Dữ liệu lọc lịch chạy không hợp lệ",
        null,
        400,
      );
    }

    return errorResponse(
      error.message || "Không thể lấy danh sách lịch chạy",
      null,
      500,
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createAdminScheduleTemplateSchema.parse(body);

    const data = await createAdminScheduleTemplate(parsed);

    return successResponse(data, "Tạo lịch chạy mẫu thành công");
  } catch (error: any) {
    console.error("[CREATE ADMIN SCHEDULE ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(
      error.message || "Không thể tạo lịch chạy mẫu",
      null,
      500,
    );
  }
}
