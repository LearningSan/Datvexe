import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { updateSeatLayoutDetailSchema } from "@/validators/admin/seat-layout.validator";

import { updateAdminSeatLayoutDetail } from "@/services/server/admin/admin-seat-layout.service";

interface Context {
  params: Promise<{
    seatLayoutId: string;
    seatLayoutDetailId: string;
  }>;
}

function parseId(value: string, fieldName: string): number {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`${fieldName} không hợp lệ`);
  }

  return id;
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(req);

    const {
      seatLayoutId: rawSeatLayoutId,
      seatLayoutDetailId: rawSeatLayoutDetailId,
    } = await context.params;

    const seatLayoutId = parseId(rawSeatLayoutId, "seatLayoutId");

    const seatLayoutDetailId = parseId(
      rawSeatLayoutDetailId,
      "seatLayoutDetailId",
    );

    const body = await req.json();

    const payload = updateSeatLayoutDetailSchema.parse(body);

    const data = await updateAdminSeatLayoutDetail(
      seatLayoutId,
      seatLayoutDetailId,
      payload,
    );

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[PATCH ADMIN SEAT LAYOUT DETAIL ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể cập nhật thông tin ghế";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (
      message === "seatLayoutId không hợp lệ" ||
      message === "seatLayoutDetailId không hợp lệ"
    ) {
      return errorResponse(message, null, 400);
    }

    if (
      message === "Không tìm thấy sơ đồ ghế" ||
      message === "Không tìm thấy ghế trong sơ đồ"
    ) {
      return errorResponse(message, null, 404);
    }

    if (
      message.includes("đã tồn tại") ||
      message.includes("đang được sử dụng")
    ) {
      return errorResponse(message, null, 409);
    }

    return errorResponse(message, null, 500);
  }
}
