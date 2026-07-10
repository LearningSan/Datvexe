import { getAdminRouteOptions } from "@/services/server/admin/admin-route.service";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function GET() {
  try {
    const data = await getAdminRouteOptions();
    return successResponse(data);
  } catch (error: any) {
    console.error("[ADMIN ROUTE OPTIONS ERROR]", error);

    return errorResponse(
      error.message || "Không thể lấy dữ liệu điểm đi/điểm đến",
      null,
      500,
    );
  }
}
