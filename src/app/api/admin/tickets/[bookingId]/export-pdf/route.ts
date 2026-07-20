import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { errorResponse } from "@/lib/server/response";

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

    return new Response(data.html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="ticket-${bookingId}.html"`,
      },
    });
  } catch (error: unknown) {
    console.error("[ADMIN DOWNLOAD TICKET HTML ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể tải file vé";

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
