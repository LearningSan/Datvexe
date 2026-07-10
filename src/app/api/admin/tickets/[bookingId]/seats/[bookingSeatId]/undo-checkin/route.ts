import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { undoCheckinAdminTicketSeat } from "@/services/server/admin/admin-ticket.service";

export async function POST(
  _: NextRequest,
  context: { params: Promise<{ bookingId: string; bookingSeatId: string }> },
) {
  try {
    const { bookingId, bookingSeatId } = await context.params;

    return successResponse(
      await undoCheckinAdminTicketSeat(Number(bookingId), Number(bookingSeatId)),
      "Đã bỏ check-in ghế",
    );
  } catch (error: any) {
    return errorResponse(
      error.message || "Không thể bỏ check-in ghế",
      null,
      500,
    );
  }
}
