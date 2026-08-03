import { NextRequest } from "next/server";

import { getBookingsByGroupSchema } from "@/validators/client/booking.validator";

import { getBookingsByGroupId } from "@/services/server/client/booking.service";

import { successResponse, errorResponse } from "@/lib/server/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const payload = getBookingsByGroupSchema.parse(body);

    const data = await getBookingsByGroupId(payload.bookingGroupId);

    return successResponse(data);
  } catch (error: any) {
    console.error("[GET BOOKINGS BY GROUP ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(
        error.errors?.[0]?.message || "Payload không hợp lệ",
        null,
        400,
      );
    }

    return errorResponse(
      error.message || "Không thể lấy booking group",
      null,
      500,
    );
  }
}
