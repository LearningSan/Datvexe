import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { generateTripsFromSchedule } from "@/services/server/admin/admin-schedule.service";

import { generateTripsFromScheduleSchema } from "@/validators/admin/schedule.validator";

export async function POST(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const body = await req.json();
    const parsed = generateTripsFromScheduleSchema.parse(body);

    const data = await generateTripsFromSchedule(parsed);

    return successResponse(data, "Sinh chuyến từ lịch mẫu thành công");
  } catch (error: unknown) {
    console.error("[GENERATE TRIPS FROM SCHEDULE ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể sinh chuyến từ lịch mẫu";

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
