import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { getAvailableSeatsForAdminTicket } from "@/services/server/admin/admin-ticket.service";

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await context.params;

    return successResponse(await getAvailableSeatsForAdminTicket(Number(bookingId)));
  } catch (error: any) {
    return errorResponse(
      error.message || "Không thể tải ghế khả dụng",
      null,
      500,
    );
  }
}
