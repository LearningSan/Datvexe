import { expireSeatHolds } from "@/services/server/client/booking.service";

import { errorResponse, successResponse } from "@/lib/server/response";

export async function POST() {
  try {
    const result = await expireSeatHolds();

    return successResponse(result);
  } catch (error: any) {
    console.error("Cleanup expired seat holds error:", error);

    return errorResponse(
      error.message || "Failed to cleanup expired seat holds",
      null,
      500,
    );
  }
}
