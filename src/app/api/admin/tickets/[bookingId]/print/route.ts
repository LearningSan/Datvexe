import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { getAdminTicketPrintHtml } from "@/services/server/admin/admin-ticket.service";

interface Context {
  params: Promise<{
    bookingId: string;
  }>;
}

function parseBookingId(value: string): number {
  const bookingId = Number(value);

  if (!Number.isInteger(bookingId) || bookingId <= 0) {
    throw new Error("bookingId không hợp lệ");
  }

  return bookingId;
}

export async function GET(req: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(req);

    const { bookingId: rawBookingId } = await context.params;
    const bookingId = parseBookingId(rawBookingId);

    const data = await getAdminTicketPrintHtml(bookingId);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN TICKET PRINT ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể lấy mẫu in vé";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    return errorResponse(
      message,
      null,
      message === "bookingId không hợp lệ" ? 400 : 500,
    );
  }
}
