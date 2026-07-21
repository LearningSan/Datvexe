import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";

import { updatePassengerCheckin } from "@/services/server/admin/checkin/admin-checkin-passenger.service";

import type {
  PassengerCheckinAction,
  UpdatePassengerCheckinPayload,
} from "@/types/admin/checkin/checkin-operation.type";

type RouteContext = {
  params: Promise<{
    bookingSeatId: string;
  }>;
};

const PASSENGER_CHECKIN_ACTIONS = [
  "CHECK_IN",
  "UNDO_CHECK_IN",
  "NO_SHOW",
  "REJECT",
] as const satisfies readonly PassengerCheckinAction[];

function parsePositiveInteger(value: unknown, fieldName: string): number {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim()
        ? Number(value)
        : Number.NaN;

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} không hợp lệ`);
  }

  return parsed;
}

function parseCheckinAction(value: unknown): PassengerCheckinAction {
  if (
    typeof value !== "string" ||
    !PASSENGER_CHECKIN_ACTIONS.includes(value as PassengerCheckinAction)
  ) {
    throw new Error("Thao tác check-in không hợp lệ");
  }

  return value as PassengerCheckinAction;
}

function parseNullableNote(value: unknown): string | null {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("Ghi chú check-in không hợp lệ");
  }

  const note = value.trim();

  if (!note) {
    return null;
  }

  if (note.length > 255) {
    throw new Error("Ghi chú không được vượt quá 255 ký tự");
  }

  return note;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getErrorStatus(message: string): number {
  const normalizedMessage = message.toLowerCase();

  if (
    normalizedMessage.includes("chưa đăng nhập") ||
    normalizedMessage.includes("unauthorized")
  ) {
    return 401;
  }

  if (
    normalizedMessage.includes("không có quyền") ||
    normalizedMessage.includes("forbidden")
  ) {
    return 403;
  }

  if (
    normalizedMessage.includes("không tìm thấy hành khách") ||
    normalizedMessage.includes("không tìm thấy ghế")
  ) {
    return 404;
  }

  if (
    normalizedMessage.includes("không hợp lệ") ||
    normalizedMessage.includes("đã được check-in") ||
    normalizedMessage.includes("đã được đánh dấu") ||
    normalizedMessage.includes("đã bị từ chối") ||
    normalizedMessage.includes("chỉ có thể") ||
    normalizedMessage.includes("đã bị hủy") ||
    normalizedMessage.includes("đã được hoàn tiền") ||
    normalizedMessage.includes("chưa được xác nhận") ||
    normalizedMessage.includes("chưa thanh toán") ||
    normalizedMessage.includes("đã hoàn thành") ||
    normalizedMessage.includes("không được vượt quá")
  ) {
    return 400;
  }

  return 500;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const adminId = await getAdminAuthUserId(request);

    if (!adminId) {
      return NextResponse.json(
        {
          success: false,
          message: "Chưa đăng nhập",
        },
        {
          status: 401,
        },
      );
    }

    const { bookingSeatId: bookingSeatIdParam } = await context.params;

    const bookingSeatId = parsePositiveInteger(
      bookingSeatIdParam,
      "bookingSeatId",
    );

    const rawBody: unknown = await request.json();

    if (!isRecord(rawBody)) {
      throw new Error("Dữ liệu yêu cầu không hợp lệ");
    }

    const action = parseCheckinAction(rawBody.action);
    const note = parseNullableNote(rawBody.note);

    const payload: UpdatePassengerCheckinPayload = {
      bookingSeatId,
      action,
      note,
    };

    const result = await updatePassengerCheckin({
      ...payload,
      performedBy: adminId,
    });

    return NextResponse.json(result, {
      status: 200,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Không thể cập nhật trạng thái check-in";

    console.error("[UPDATE PASSENGER CHECKIN ERROR]", {
      message,
      error,
    });

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status: getErrorStatus(message),
      },
    );
  }
}
