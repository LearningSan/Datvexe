import { getAdminScheduleOptions } from "@/services/server/admin/admin-schedule.service";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function GET() {
  try {
    const data = await getAdminScheduleOptions();

    return successResponse(data);
  } catch (error: any) {
    console.error("[ADMIN SCHEDULE OPTIONS ERROR]", error);

    return errorResponse(
      error.message || "Không thể lấy dữ liệu tuyến xe",
      null,
      500,
    );
  }
}
