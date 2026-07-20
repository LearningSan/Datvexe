import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { getAdminTripPassengerList } from "@/services/server/admin/admin-ticket.service";

interface Context {
  params: Promise<{
    tripId: string;
  }>;
}

function parseTripId(value: string): number {
  const tripId = Number(value);

  if (!Number.isInteger(tripId) || tripId <= 0) {
    throw new Error("tripId không hợp lệ");
  }

  return tripId;
}

export async function GET(req: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(req);

    const { tripId: rawTripId } = await context.params;
    const tripId = parseTripId(rawTripId);

    const data = await getAdminTripPassengerList(tripId);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN TRIP PASSENGER LIST ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể tải danh sách hành khách";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    return errorResponse(
      message,
      null,
      message === "tripId không hợp lệ" ? 400 : 500,
    );
  }
}
