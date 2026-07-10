import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/server/response";

import { createBookingShuttleBulk } from "@/services/server/client/booking.service";


export async function POST(
  req: NextRequest,
  context: { params: Promise<{ bookingId: string }> }
) {
  try {
    const { bookingId } = await context.params;

    const body = await req.json();

    const result = await createBookingShuttleBulk({
      bookingId,
      ...body,
    });

    return successResponse(result);
  } catch (error: any) {
    return errorResponse(error.message, null, 500);
  }
}