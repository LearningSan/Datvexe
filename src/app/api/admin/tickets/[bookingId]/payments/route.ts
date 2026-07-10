import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { getAdminTicketPayments } from "@/services/server/admin/admin-ticket.service";

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await context.params;

    return successResponse(await getAdminTicketPayments(Number(bookingId)));
  } catch (error: any) {
    return errorResponse(
      error.message || "Không thể tải thanh toán của vé",
      null,
      500,
    );
  }
}
