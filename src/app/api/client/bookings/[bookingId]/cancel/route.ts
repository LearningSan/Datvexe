import { NextRequest } from "next/server";

import { getAuthUserId } from "@/lib/server/auth-user";

import { successResponse, errorResponse } from "@/lib/server/response";

import { cancelUserTicket } from "@/services/server/client/ticket.service";

export async function POST(
  req: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      bookingId: string;
    }>;
  },
) {
  try {
    const userId = await getAuthUserId(req);

    const { bookingId } = await params;

    const id = Number(bookingId);

    if (!Number.isInteger(id) || id <= 0) {
      return errorResponse("bookingId không hợp lệ", null, 400);
    }

    const data = await cancelUserTicket(userId, id);

    return successResponse(data, "Hủy vé thành công");
  } catch (error: any) {
    console.error("[POST CANCEL TICKET ERROR]", error);

    switch (error?.message) {
      case "BOOKING_NOT_FOUND":
        return errorResponse("Không tìm thấy vé", null, 404);

      case "CANCEL_TOO_LATE":
        return errorResponse(
          "Vé chỉ được hủy trước giờ khởi hành ít nhất 2 giờ",
          null,
          409,
        );

      case "BOOKING_ALREADY_CANCELLED":
        return errorResponse("Vé đã được hủy hoặc hoàn tiền", null, 409);

      case "BOOKING_NOT_CANCELLABLE":
        return errorResponse("Vé hiện không thể hủy", null, 409);

      case "TRIP_NOT_CANCELLABLE":
        return errorResponse("Chuyến xe hiện không thể hủy vé", null, 409);

      case "WALLET_NOT_FOUND":
        return errorResponse("Không tìm thấy ví nội bộ", null, 404);

      case "WALLET_LOCKED":
        return errorResponse("Ví nội bộ đang bị khóa", null, 409);

      case "EXTERNAL_REFUND_REQUIRED":
        return errorResponse(
          "Phương thức thanh toán này cần xử lý hoàn tiền qua cổng thanh toán",
          null,
          409,
        );

      default:
        return errorResponse("Không thể hủy vé", null, 500);
    }
  }
}
