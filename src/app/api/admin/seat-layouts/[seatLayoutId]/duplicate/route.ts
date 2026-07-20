import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { duplicateAdminSeatLayout } from "@/services/server/admin/admin-seat-layout.service";

import { duplicateSeatLayoutSchema } from "@/validators/admin/seat-layout.validator";

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

function getErrorCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return null;
}

export async function POST(req: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(req);

    const { seatLayoutId: rawSeatLayoutId } = await context.params;
    const seatLayoutId = parseSeatLayoutId(rawSeatLayoutId);

    const body = await req.json();
    const parsed = duplicateSeatLayoutSchema.parse(body);

    const data = await duplicateAdminSeatLayout(seatLayoutId, parsed);

    return successResponse(data, "Nhân bản sơ đồ ghế thành công");
  } catch (error: unknown) {
    console.error("[DUPLICATE ADMIN SEAT LAYOUT ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể nhân bản sơ đồ ghế";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Dữ liệu JSON không hợp lệ", null, 400);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(message, null, 400);
    }

    if (getErrorCode(error) === "ER_DUP_ENTRY") {
      return errorResponse("Mã layout mới đã tồn tại", null, 409);
    }

    return errorResponse(
      message,
      null,
      message === "seatLayoutId không hợp lệ" ? 400 : 500,
    );
  }
}
