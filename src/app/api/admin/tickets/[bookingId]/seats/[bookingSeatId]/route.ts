import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { removeAdminTicketSeat } from "@/services/server/admin/admin-ticket.service";

interface Context {
  params: Promise<{
    bookingId: string;
    bookingSeatId: string;
  }>;
}

function parsePositiveId(value: string, fieldName: string): number {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`${fieldName} không hợp lệ`);
  }

  return id;
}

export async function DELETE(req: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(req);

    const params = await context.params;

    const bookingId = parsePositiveId(params.bookingId, "bookingId");
    const bookingSeatId = parsePositiveId(
      params.bookingSeatId,
      "bookingSeatId",
    );

    const data = await removeAdminTicketSeat(
      bookingId,
      bookingSeatId,
    );

    return successResponse(data, "Gỡ ghế thành công");
  } catch (error: unknown) {
    console.error("[ADMIN REMOVE TICKET SEAT ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể gỡ ghế";

    if (message === "UNAUTHORIZED") {
      return errorResponse(
        "Phiên đăng nhập quản trị không hợp lệ",
        null,
        401,
      );
    }

    if (
      message === "bookingId không hợp lệ" ||
      message === "bookingSeatId không hợp lệ"
    ) {
      return errorResponse(message, null, 400);
    }

    return errorResponse(message, null, 500);
  }
}