import { NextRequest } from "next/server";

import { bookingPaymentSummaryParamsSchema } from "@/validators/client/payment.validator";
import { getBookingPaymentSummary } from "@/services/server/client/payment.service";
import { successResponse, errorResponse } from "@/lib/server/response";

interface Context {
  params: Promise<{
    bookingId: string;
  }>;
}

export async function GET(_req: NextRequest, context: Context) {
  try {
    const params = await context.params;

    const parsed = bookingPaymentSummaryParamsSchema.parse(params);

    const data = await getBookingPaymentSummary(parsed.bookingId);

    return successResponse(data);
  } catch (error: any) {
    console.error("[BOOKING PAYMENT SUMMARY ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(
        error.errors?.[0]?.message || "bookingId không hợp lệ",
        null,
        400,
      );
    }

    if (error.message === "Booking không tồn tại") {
      return errorResponse(error.message, null, 404);
    }

    return errorResponse(
      error.message || "Failed to get booking payment summary",
      null,
      500,
    );
  }
}
