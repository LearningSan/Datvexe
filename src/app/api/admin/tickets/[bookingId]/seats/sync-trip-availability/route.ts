import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { syncAdminTicketTripSeats } from "@/services/server/admin/admin-ticket.service";

export async function POST(
  _: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await context.params;

    return successResponse(
      await syncAdminTicketTripSeats(Number(bookingId)),
      "Đã đồng bộ ghế trống",
    );
  } catch (error: any) {
    return errorResponse(
      error.message || "Không thể đồng bộ ghế trống",
      null,
      500,
    );
  }
}
