import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { checkinAdminTicketSeat } from "@/services/server/admin/admin-ticket.service";

export async function POST(
  _: NextRequest,
  context: { params: Promise<{ bookingId: string; bookingSeatId: string }> },
) {
  try {
    const { bookingId, bookingSeatId } = await context.params;

    return successResponse(
      await checkinAdminTicketSeat(Number(bookingId), Number(bookingSeatId)),
      "Check-in ghế thành công",
    );
  } catch (error: any) {
    return errorResponse(error.message || "Không thể check-in ghế", null, 500);
  }
}
