import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { changeAdminTicketTrip } from "@/services/server/admin/admin-ticket.service";
import { changeTicketTripSchema } from "@/validators/admin/ticket.validator";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await context.params;
    const parsed = changeTicketTripSchema.parse(await req.json());

    return successResponse(
      await changeAdminTicketTrip(Number(bookingId), parsed),
      "Đổi vé thành công",
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(error.message || "Không thể đổi vé", null, 500);
  }
}
