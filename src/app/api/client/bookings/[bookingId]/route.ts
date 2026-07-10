import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";
import { getBookingPaymentSummary } from "@/services/server/client/booking.service";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bookingId: string }> },
) {
  try {
    const { bookingId } = await params;

    const id = Number(bookingId);

    if (!id || isNaN(id)) {
      return errorResponse("Invalid bookingId", null, 400);
    }

    const data = await getBookingPaymentSummary(id);

    return successResponse(data);
  } catch (e: any) {
    return errorResponse(e.message, null, 500);
  }
}
