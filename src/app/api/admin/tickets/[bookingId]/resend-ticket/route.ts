import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { resendAdminTicket } from "@/services/server/admin/admin-ticket.service";

export async function POST(
  _: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await context.params;

    return successResponse(
      await resendAdminTicket(Number(bookingId)),
      "Đã gửi lại vé cho khách",
    );
  } catch (error: any) {
    return errorResponse(error.message || "Không thể gửi lại vé", null, 500);
  }
}
