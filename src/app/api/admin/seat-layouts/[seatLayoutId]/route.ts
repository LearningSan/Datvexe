import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { getAdminSeatLayoutDetail } from "@/services/server/admin/admin-seat-layout.service";

interface Context {
  params: Promise<{
    seatLayoutId: string;
  }>;
}

function parseSeatLayoutId(value: string): number {
  const seatLayoutId = Number(value);

  if (!Number.isInteger(seatLayoutId) || seatLayoutId <= 0) {
    throw new Error("seatLayoutId không hợp lệ");
  }

  return seatLayoutId;
}

export async function GET(req: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(req);

    const { seatLayoutId: rawSeatLayoutId } = await context.params;
    const seatLayoutId = parseSeatLayoutId(rawSeatLayoutId);

    const data = await getAdminSeatLayoutDetail(seatLayoutId);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[GET ADMIN SEAT LAYOUT DETAIL ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể lấy chi tiết sơ đồ ghế";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    return errorResponse(
      message,
      null,
      message === "seatLayoutId không hợp lệ" ? 400 : 500,
    );
  }
}
