import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { addAdminTicketSeats } from "@/services/server/admin/admin-ticket.service";

import { addTicketSeatsSchema } from "@/validators/admin/ticket.validator";

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

    const body = await req.json();
    const parsed = addTicketSeatsSchema.parse(body);

    const data = await addAdminTicketSeats(bookingId, parsed);

    return successResponse(data, "Thêm ghế thành công");
  } catch (error: unknown) {
    console.error("[ADMIN ADD TICKET SEATS ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể thêm ghế";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Dữ liệu JSON không hợp lệ", null, 400);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(message, null, 400);
    }

    return errorResponse(
      message,
      null,
      message === "bookingId không hợp lệ" ? 400 : 500,
    );
  }
}
