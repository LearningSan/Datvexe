import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { changeAdminTicketSeats } from "@/services/server/admin/admin-ticket.service";
import { changeTicketSeatsSchema } from "@/validators/admin/ticket.validator";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await context.params;
    const parsed = changeTicketSeatsSchema.parse(await req.json());

    return successResponse(
      await changeAdminTicketSeats(Number(bookingId), parsed),
      "Đổi ghế thành công",
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(error.message || "Không thể đổi ghế", null, 500);
  }
}
