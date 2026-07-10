import { getAdminVehicleOptions } from "@/services/server/admin/admin-vehicle.service";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function GET() {
  try {
    const data = await getAdminVehicleOptions();
    return successResponse(data);
  } catch (error: any) {
    return errorResponse(
      error.message || "Không thể lấy dữ liệu xe",
      null,
      500,
    );
  }
}
