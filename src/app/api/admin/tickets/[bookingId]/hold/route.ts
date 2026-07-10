import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import {
  cancelAdminTicketHold,
  extendAdminTicketHold,
} from "@/services/server/admin/admin-ticket.service";
import { extendTicketHoldSchema } from "@/validators/admin/ticket.validator";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await context.params;
    const parsed = extendTicketHoldSchema.parse(await req.json());

    return successResponse(
      await extendAdminTicketHold(Number(bookingId), parsed),
      "Gia hạn giữ chỗ thành công",
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(
      error.message || "Không thể gia hạn giữ chỗ",
      null,
      500,
    );
  }
}

export async function DELETE(
  _: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await context.params;

    return successResponse(
      await cancelAdminTicketHold(Number(bookingId)),
      "Hủy giữ chỗ thành công",
    );
  } catch (error: any) {
    return errorResponse(
      error.message || "Không thể hủy giữ chỗ",
      null,
      500,
    );
  }
}
