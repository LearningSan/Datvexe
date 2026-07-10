import { getAdminSeatLayouts } from "@/services/server/admin/admin-seat-layout.service";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function GET() {
  try {
    const data = await getAdminSeatLayouts();
    return successResponse(data);
  } catch (error: any) {
    return errorResponse(
      error.message || "Không thể lấy danh sách sơ đồ ghế",
      null,
      500,
    );
  }
}
