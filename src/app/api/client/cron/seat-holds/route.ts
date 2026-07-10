import { NextRequest } from "next/server";

import { successResponse, errorResponse } from "@/lib/server/response";

import { cleanupExpiredSeatHolds } from "@/services/server/client/seat-hold-cleanup.service";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return errorResponse("Unauthorized", null, 401);
    }

    const result = await cleanupExpiredSeatHolds();

    return successResponse(result);
  } catch (error: any) {
    console.error("[SEAT HOLD CLEANUP ERROR]", error);

    return errorResponse(
      error.message || "Không thể cleanup seat holds",
      null,
      500,
    );
  }
}
