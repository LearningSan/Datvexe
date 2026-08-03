import { NextRequest } from "next/server";

import { bookingPaymentSummarySchema } from "@/validators/client/payment.validator";
import { getBookingGroupPaymentSummary } from "@/services/server/client/payment.service";

import { successResponse, errorResponse } from "@/lib/server/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const payload = bookingPaymentSummarySchema.parse(body);

    const data = await getBookingGroupPaymentSummary(payload.bookingIds);

    return successResponse(data);
  } catch (error: any) {
    console.error("[BOOKING GROUP PAYMENT SUMMARY ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(
        error.errors?.[0]?.message || "bookingIds không hợp lệ",
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
