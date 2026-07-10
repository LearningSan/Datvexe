import { getAdminTripOptions } from "@/services/server/admin/admin-trip.service";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function GET() {
  try {
    const data = await getAdminTripOptions();

    return successResponse(data);
  } catch (error: any) {
    console.error("[ADMIN TRIP OPTIONS ERROR]", error);

    return errorResponse(
      error.message || "Không thể lấy dữ liệu bộ lọc chuyến xe",
      null,
      500,
    );
  }
}
