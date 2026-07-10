import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { getAdminTicketDetail } from "@/services/server/admin/admin-ticket.service";

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await context.params;

    return successResponse(await getAdminTicketDetail(Number(bookingId)));
  } catch (error: any) {
    return errorResponse(
      error.message || "Không thể tải chi tiết vé",
      null,
      500,
    );
  }
}
