import { NextRequest } from "next/server";

import { updateAdminScheduleTemplateStatus } from "@/services/server/admin/admin-schedule.service";

import {
  scheduleTemplateIdParamsSchema,
  updateScheduleTemplateStatusSchema,
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
    const parsedBody = updateScheduleTemplateStatusSchema.parse(body);

    const data = await updateAdminScheduleTemplateStatus(
      parsedParams.scheduleTemplateId,
      parsedBody.isActive,
    );

    return successResponse(data, "Cập nhật trạng thái lịch chạy thành công");
  } catch (error: any) {
    console.error("[UPDATE SCHEDULE STATUS ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(
      error.message || "Không thể cập nhật trạng thái lịch chạy",
      null,
      500,
    );
  }
}
