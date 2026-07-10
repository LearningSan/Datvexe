import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { updateAdminTicketPickupDropoff } from "@/services/server/admin/admin-ticket.service";
import { pickupDropoffSchema } from "@/validators/admin/ticket.validator";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await context.params;
    const parsed = pickupDropoffSchema.parse(await req.json());

    return successResponse(
      await updateAdminTicketPickupDropoff(Number(bookingId), parsed),
      "Cập nhật điểm đón/trả thành công",
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(
      error.message || "Không thể cập nhật điểm đón/trả",
      null,
      500,
    );
  }
}
