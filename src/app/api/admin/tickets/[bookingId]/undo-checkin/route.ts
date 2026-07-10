import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { undoCheckinAdminTicket } from "@/services/server/admin/admin-ticket.service";

export async function POST(
  _: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await context.params;

    return successResponse(
      await undoCheckinAdminTicket(Number(bookingId)),
      "Đã bỏ check-in booking",
    );
  } catch (error: any) {
    return errorResponse(
      error.message || "Không thể bỏ check-in booking",
      null,
      500,
    );
  }
}
