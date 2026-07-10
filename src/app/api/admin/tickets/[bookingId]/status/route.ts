import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { updateAdminTicketStatus } from "@/services/server/admin/admin-ticket.service";
import { updateTicketStatusSchema } from "@/validators/admin/ticket.validator";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await context.params;
    const parsed = updateTicketStatusSchema.parse(await req.json());

    return successResponse(
      await updateAdminTicketStatus(Number(bookingId), parsed),
      "Cập nhật trạng thái vé thành công",
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(
      error.message || "Không thể cập nhật trạng thái vé",
      null,
      500,
    );
  }
}
