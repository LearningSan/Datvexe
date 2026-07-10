import { NextRequest } from "next/server";

import { updateAdminScheduleTemplate } from "@/services/server/admin/admin-schedule.service";

import {
  scheduleTemplateIdParamsSchema,
  updateAdminScheduleTemplateSchema,
} from "@/validators/admin/schedule.validator";

import { successResponse, errorResponse } from "@/lib/server/response";

interface Context {
  params: Promise<{
    scheduleTemplateId: string;
  }>;
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const params = await context.params;
    const body = await req.json();

    const parsedParams = scheduleTemplateIdParamsSchema.parse(params);
    const parsedBody = updateAdminScheduleTemplateSchema.parse(body);

    const data = await updateAdminScheduleTemplate(
      parsedParams.scheduleTemplateId,
      parsedBody,
    );

    return successResponse(data, "Cập nhật lịch chạy mẫu thành công");
  } catch (error: any) {
    console.error("[UPDATE ADMIN SCHEDULE ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(
      error.message || "Không thể cập nhật lịch chạy mẫu",
      null,
      500,
    );
  }
}
