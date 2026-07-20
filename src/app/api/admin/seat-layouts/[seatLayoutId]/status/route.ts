import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { updateAdminSeatLayoutStatus } from "@/services/server/admin/admin-seat-layout.service";

import { updateSeatLayoutStatusSchema } from "@/validators/admin/seat-layout.validator";

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

export async function PATCH(req: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(req);

    const { seatLayoutId: rawSeatLayoutId } = await context.params;
    const seatLayoutId = parseSeatLayoutId(rawSeatLayoutId);

    const body = await req.json();
    const parsed = updateSeatLayoutStatusSchema.parse(body);

    const data = await updateAdminSeatLayoutStatus(
      seatLayoutId,
      parsed.isActive,
    );

    return successResponse(data, "Cập nhật trạng thái layout thành công");
  } catch (error: unknown) {
    console.error("[UPDATE ADMIN SEAT LAYOUT STATUS ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể cập nhật layout";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Dữ liệu JSON không hợp lệ", null, 400);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(message, null, 400);
    }

    return errorResponse(
      message,
      null,
      message === "seatLayoutId không hợp lệ" ? 400 : 500,
    );
  }
}
