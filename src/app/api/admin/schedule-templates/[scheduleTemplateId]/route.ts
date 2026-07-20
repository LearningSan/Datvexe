import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { updateAdminScheduleTemplate } from "@/services/server/admin/admin-schedule.service";

import {
  scheduleTemplateIdParamsSchema,
  updateAdminScheduleTemplateSchema,
} from "@/validators/admin/schedule.validator";

interface Context {
  params: Promise<{
    scheduleTemplateId: string;
  }>;
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(req);

    const params = await context.params;
    const body = await req.json();

    const parsedParams = scheduleTemplateIdParamsSchema.parse(params);
    const parsedBody = updateAdminScheduleTemplateSchema.parse(body);

    const data = await updateAdminScheduleTemplate(
      parsedParams.scheduleTemplateId,
      parsedBody,
    );

    return successResponse(data, "Cập nhật lịch chạy mẫu thành công");
  } catch (error: unknown) {
    console.error("[UPDATE ADMIN SCHEDULE ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể cập nhật lịch chạy mẫu";

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
