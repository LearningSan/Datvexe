import { NextRequest } from "next/server";

import { getAuthUserId } from "@/lib/server/auth-user";

import { successResponse, errorResponse } from "@/lib/server/response";

import { previewCancelTicket } from "@/services/server/client/ticket.service";

export async function GET(
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
      return errorResponse("Mã vé không hợp lệ", null, 400);
    }

    const data = await previewCancelTicket(userId, id);

    return successResponse(data, "Lấy thông tin hủy vé thành công");
  } catch (error: any) {
    console.error("[GET CANCEL TICKET PREVIEW ERROR]", error);

    switch (error?.message) {
      case "BOOKING_NOT_FOUND":
        return errorResponse("Không tìm thấy vé", null, 404);

      case "BOOKING_ALREADY_CANCELLED":
        return errorResponse("Vé đã được hủy trước đó", null, 409);

      case "BOOKING_NOT_CANCELLABLE":
        return errorResponse("Vé hiện không thể hủy", null, 409);

      case "TRIP_NOT_CANCELLABLE":
        return errorResponse("Chuyến này hiện không thể hủy vé", null, 409);

      case "CANCEL_TOO_LATE":
        return errorResponse(
          "Không thể hủy vé vì thời gian khởi hành còn dưới 2 giờ",
          null,
          409,
        );

      default:
        return errorResponse("Không thể lấy thông tin hủy vé", null, 500);
    }
  }
}
