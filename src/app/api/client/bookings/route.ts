import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { errorResponse, successResponse } from "@/lib/server/response";
import { createBookingSchema } from "@/validators/client/booking.validator";
import { createPendingBooking } from "@/services/server/client/booking.service";
import { getCurrentUser } from "@/services/server/client/user.service";
import { getAuthUserId } from "@/lib/server/auth-user";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const payload = createBookingSchema.parse(body);

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

    const result = await createPendingBooking(payload, userId);

    return successResponse(result);
  } catch (error: any) {
    console.error(error);

    if (error instanceof ZodError) {
      return errorResponse(
        error.issues?.[0]?.message || "Invalid payload",
        null,
        400,
      );
    }

    switch (error.message) {
      case "TRIP_NOT_FOUND":
        return errorResponse("Không tìm thấy chuyến xe", null, 404);

      case "SEAT_ALREADY_BOOKED":
        return errorResponse("Ghế đã được đặt", null, 409);

      case "SEAT_ALREADY_HELD":
        return errorResponse("Ghế đang được người khác giữ", null, 409);

      case "TOO_MANY_SEATS":
        return errorResponse("Chỉ được chọn tối đa 5 ghế", null, 400);

      default:
        return errorResponse(
          error.message || "Không thể tạo booking",
          null,
          500,
        );
    }
  }
}
