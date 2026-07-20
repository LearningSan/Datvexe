import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { getAdminOfflineTicketPreview } from "@/services/server/admin/admin-ticket.service";

function parseTripId(value: string | null): number {
  const tripId = Number(value);

  if (!Number.isInteger(tripId) || tripId <= 0) {
    throw new Error("tripId không hợp lệ");
  }

  return tripId;
}

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const tripId = parseTripId(req.nextUrl.searchParams.get("tripId"));

    const data = await getAdminOfflineTicketPreview(tripId);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN OFFLINE TICKET PREVIEW ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể tải dữ liệu tạo vé offline";

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
