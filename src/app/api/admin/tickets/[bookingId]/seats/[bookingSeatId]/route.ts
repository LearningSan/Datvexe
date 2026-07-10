import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { removeAdminTicketSeat } from "@/services/server/admin/admin-ticket.service";

export async function DELETE(
  _: NextRequest,
  context: { params: Promise<{ bookingId: string; bookingSeatId: string }> },
) {
  try {
    const { bookingId, bookingSeatId } = await context.params;

    return successResponse(
      await removeAdminTicketSeat(Number(bookingId), Number(bookingSeatId)),
      "Gỡ ghế thành công",
    );
  } catch (error: any) {
    return errorResponse(error.message || "Không thể gỡ ghế", null, 500);
  }
}
