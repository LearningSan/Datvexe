import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";

import { updatePassengerContact } from "@/services/server/admin/checkin/admin-checkin-contact.service";

import type {
  PassengerContactResult,
  PassengerContactType,
  UpdatePassengerContactPayload,
} from "@/types/admin/checkin/checkin-operation.type";

type RouteContext = {
  params: Promise<{
    bookingId: string;
  }>;
};

const CONTACT_TYPES = [
  "PHONE_CALL",
  "IN_APP_NOTIFICATION",
  "EMAIL",
  "MANUAL",
] as const satisfies readonly PassengerContactType[];

const CONTACT_RESULTS = [
  "CONTACTED",
  "COMING",
  "ARRIVING_LATE",
  "UNREACHABLE",
  "CANCEL_REQUESTED",
] as const satisfies readonly PassengerContactResult[];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

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

function parseContactType(value: unknown): PassengerContactType {
  if (
    typeof value !== "string" ||
    !CONTACT_TYPES.includes(value as PassengerContactType)
  ) {
    throw new Error("Hình thức liên hệ không hợp lệ");
  }

  return value as PassengerContactType;
}

function parseContactResult(value: unknown): PassengerContactResult {
  if (
    typeof value !== "string" ||
    !CONTACT_RESULTS.includes(value as PassengerContactResult)
  ) {
    throw new Error("Kết quả liên hệ không hợp lệ");
  }

  return value as PassengerContactResult;
}

function parseNullableString(value: unknown, fieldName: string): string | null {
  if (value == null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error(`${fieldName} không hợp lệ`);
  }

  const normalized = value.trim();

  if (!normalized) {
    return null;
  }

  if (normalized.length > 255) {
    throw new Error(`${fieldName} không được vượt quá 255 ký tự`);
  }

  return normalized;
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

  if (normalizedMessage.includes("không tìm thấy booking")) {
    return 404;
  }

  if (
    normalizedMessage.includes("không hợp lệ") ||
    normalizedMessage.includes("phải nhập") ||
    normalizedMessage.includes("đã bị hủy") ||
    normalizedMessage.includes("đã được hoàn tiền") ||
    normalizedMessage.includes("chưa được xác nhận") ||
    normalizedMessage.includes("chưa thanh toán") ||
    normalizedMessage.includes("đã hoàn thành") ||
    normalizedMessage.includes("không còn ghế") ||
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

    const { bookingId: bookingIdParam } = await context.params;

    const bookingId = parsePositiveInteger(bookingIdParam, "bookingId");

    const rawBody: unknown = await request.json();

    if (!isRecord(rawBody)) {
      throw new Error("Dữ liệu yêu cầu không hợp lệ");
    }

    const payload: UpdatePassengerContactPayload = {
      bookingId,

      tripId: parsePositiveInteger(rawBody.tripId, "tripId"),

      contactType: parseContactType(rawBody.contactType),

      contactResult: parseContactResult(rawBody.contactResult),

      expectedArrivalAt: parseNullableString(
        rawBody.expectedArrivalAt,
        "Thời gian khách dự kiến đến",
      ),

      note: parseNullableString(rawBody.note, "Ghi chú"),
    };

    const result = await updatePassengerContact({
      ...payload,
      contactedBy: adminId,
    });

    return NextResponse.json(result, {
      status: 200,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Không thể cập nhật trạng thái liên hệ";

    console.error("[UPDATE PASSENGER CONTACT ERROR]", {
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
