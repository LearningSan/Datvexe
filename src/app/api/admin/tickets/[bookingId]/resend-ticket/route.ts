import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { resendAdminTicket } from "@/services/server/admin/admin-ticket.service";

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

export async function POST(req: NextRequest, context: Context) {
  try {
     await getAdminAuthUserId(req);

    const { bookingId: rawBookingId } = await context.params;
    const bookingId = parseBookingId(rawBookingId);

    const data = await resendAdminTicket(bookingId);

    return successResponse(data, "Đã gửi lại vé cho khách");
  } catch (error: unknown) {
    console.error("[ADMIN RESEND TICKET ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể gửi lại vé";

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
