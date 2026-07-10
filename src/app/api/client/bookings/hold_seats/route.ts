import { NextRequest } from "next/server";

import { successResponse, errorResponse } from "@/lib/server/response";
import { validateHoldSeatsPayload } from "@/validators/client/booking.validator";
import { holdSeats } from "@/services/server/client/booking.service";
import { getCurrentUser } from "@/services/server/client/user.service";
import { getAuthUserId } from "@/lib/server/auth-user";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const payload = validateHoldSeatsPayload(body);

    let userId: number | null = null;

    try {
      userId = await getAuthUserId(req);
    } catch {
      userId = null;
    }

    if (userId !== null) {
      const user = await getCurrentUser(userId);

      if (!user) {
        return errorResponse("User not found", null, 404);
      }
    }

    if (!payload.sessionId) {
      return errorResponse("sessionId không hợp lệ", null, 400);
    }

    const result = await holdSeats(payload, userId);

    return successResponse(result);
  } catch (error: any) {
    return errorResponse(error.message || "Không thể giữ ghế", null, 400);
  }
}
