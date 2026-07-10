import { NextRequest } from "next/server";

import { successResponse, errorResponse } from "@/lib/server/response";

import { cancelHold } from "@/services/server/client/booking.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { bookingId, sessionId, tripId } = body;

    if (!sessionId || !tripId) {
      return errorResponse("Thiếu sessionId hoặc tripId", null, 400);
    }

    await cancelHold(bookingId, String(sessionId), Number(tripId));

    return successResponse({
      cancelled: true,
    });
  } catch (error: any) {
    console.error("[CANCEL HOLD ERROR]", error);
    return errorResponse(error.message, null, 500);
  }
}
