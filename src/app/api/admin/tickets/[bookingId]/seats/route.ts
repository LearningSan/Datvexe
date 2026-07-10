import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { addAdminTicketSeats } from "@/services/server/admin/admin-ticket.service";
import { addTicketSeatsSchema } from "@/validators/admin/ticket.validator";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await context.params;
    const parsed = addTicketSeatsSchema.parse(await req.json());

    return successResponse(
      await addAdminTicketSeats(Number(bookingId), parsed),
      "Thêm ghế thành công",
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(error.message || "Không thể thêm ghế", null, 500);
  }
}
