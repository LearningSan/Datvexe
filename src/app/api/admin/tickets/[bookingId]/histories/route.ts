import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { getAdminTicketHistories } from "@/services/server/admin/admin-ticket.service";

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await context.params;

    return successResponse(await getAdminTicketHistories(Number(bookingId)));
  } catch (error: any) {
    return errorResponse(error.message || "Không thể tải lịch sử vé", null, 500);
  }
}
