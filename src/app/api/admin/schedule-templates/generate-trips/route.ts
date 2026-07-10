import { NextRequest } from "next/server";

import { generateTripsFromSchedule } from "@/services/server/admin/admin-schedule.service";
import { generateTripsFromScheduleSchema } from "@/validators/admin/schedule.validator";

import { successResponse, errorResponse } from "@/lib/server/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = generateTripsFromScheduleSchema.parse(body);

    const data = await generateTripsFromSchedule(parsed);

    return successResponse(data, "Sinh chuyến từ lịch mẫu thành công");
  } catch (error: any) {
    console.error("[GENERATE TRIPS FROM SCHEDULE ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(
      error.message || "Không thể sinh chuyến từ lịch mẫu",
      null,
      500,
    );
  }
}
