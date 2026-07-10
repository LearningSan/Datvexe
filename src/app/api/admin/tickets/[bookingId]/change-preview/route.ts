import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { getChangeAdminTicketPreview } from "@/services/server/admin/admin-ticket.service";
import { changeTicketPreviewSchema } from "@/validators/admin/ticket.validator";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await context.params;
    const parsed = changeTicketPreviewSchema.parse(
      Object.fromEntries(req.nextUrl.searchParams),
    );

    return successResponse(
      await getChangeAdminTicketPreview(Number(bookingId), parsed),
    );
  } catch (error: any) {
    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(error.message || "Không thể xem trước đổi vé", null, 500);
  }
}
