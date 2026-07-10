import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { cancelAdminTicket } from "@/services/server/admin/admin-ticket.service";
import { cancelTicketSchema } from "@/validators/admin/ticket.validator";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await context.params;
    const parsed = cancelTicketSchema.parse(await req.json());

    return successResponse(
      await cancelAdminTicket(Number(bookingId), parsed),
      "Hủy vé thành công",
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(error.message || "Không thể hủy vé", null, 500);
  }
}
