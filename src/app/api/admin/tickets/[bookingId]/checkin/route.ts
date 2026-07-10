import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { checkinAdminTicket } from "@/services/server/admin/admin-ticket.service";

export async function POST(
  _: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await context.params;

    return successResponse(
      await checkinAdminTicket(Number(bookingId)),
      "Check-in booking thành công",
    );
  } catch (error: any) {
    return errorResponse(
      error.message || "Không thể check-in booking",
      null,
      500,
    );
  }
}
