import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";
import { getAdminOfflineTicketPreview } from "@/services/server/admin/admin-ticket.service";

export async function GET(req: NextRequest) {
  try {
    const tripId = Number(req.nextUrl.searchParams.get("tripId"));

    if (!tripId || Number.isNaN(tripId)) {
      return errorResponse("Thiếu mã chuyến", null, 400);
    }

    return successResponse(await getAdminOfflineTicketPreview(tripId));
  } catch (error: any) {
    return errorResponse(
      error.message || "Không thể tải dữ liệu tạo vé offline",
      null,
      500,
    );
  }
}
