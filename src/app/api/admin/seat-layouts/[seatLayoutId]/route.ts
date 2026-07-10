import { getAdminSeatLayoutDetail } from "@/services/server/admin/admin-seat-layout.service";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ seatLayoutId: string }> },
) {
  try {
    const { seatLayoutId } = await params;
    const data = await getAdminSeatLayoutDetail(Number(seatLayoutId));
    return successResponse(data);
  } catch (error: any) {
    return errorResponse(
      error.message || "Không thể lấy chi tiết sơ đồ ghế",
      null,
      500,
    );
  }
}
