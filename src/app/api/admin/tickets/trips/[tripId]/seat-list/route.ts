import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { getAdminTripSeatList } from "@/services/server/admin/admin-ticket.service";

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ tripId: string }> },
) {
  try {
    const { tripId } = await context.params;

    return successResponse(await getAdminTripSeatList(Number(tripId)));
  } catch (error: any) {
    return errorResponse(
      error.message || "Không thể tải danh sách ghế",
      null,
      500,
    );
  }
}
