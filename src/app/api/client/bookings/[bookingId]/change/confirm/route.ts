import { NextRequest } from "next/server";

import { getAuthUserId } from "@/lib/server/auth-user";

import { successResponse, errorResponse } from "@/lib/server/response";

import { confirmChangeTicket } from "@/services/server/client/ticket.service";

import { changeTicketPayloadSchema } from "@/validators/client/ticket.validator";

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
      return errorResponse("Booking ID không hợp lệ", null, 400);
    }

    const body = await req.json();

    const payload = changeTicketPayloadSchema.parse(body);

    const data = await confirmChangeTicket(userId, id, payload);

    return successResponse(data, "Đổi vé thành công");
  } catch (error: any) {
    console.error("[POST CHANGE TICKET CONFIRM ERROR]", error);

    switch (error?.message) {
      case "BOOKING_NOT_FOUND":
        return errorResponse("Không tìm thấy vé", null, 404);

      case "BOOKING_NOT_CHANGEABLE":
        return errorResponse("Vé hiện không thể đổi", null, 409);

      case "BOOKING_HAS_NO_SEATS":
        return errorResponse("Vé hiện không có ghế", null, 409);

      case "INVALID_NEW_SEAT_COUNT":
        return errorResponse("Số ghế mới phải bằng số ghế hiện tại", null, 409);

      case "SAME_TRIP_NOT_ALLOWED":
        return errorResponse("Không được đổi sang cùng chuyến", null, 409);

      case "OLD_TRIP_NOT_FOUND":
        return errorResponse("Không tìm thấy chuyến cũ", null, 404);

      case "NEW_TRIP_NOT_FOUND":
        return errorResponse("Không tìm thấy chuyến mới", null, 404);

      case "NEW_TRIP_NOT_OPEN":
        return errorResponse("Chuyến mới không còn mở bán", null, 409);

      case "NEW_TRIP_ALREADY_DEPARTED":
        return errorResponse("Chuyến mới đã khởi hành", null, 409);

      case "NEW_TRIP_NOT_ENOUGH_SEATS":
        return errorResponse("Chuyến mới không đủ số ghế", null, 409);

      case "INVALID_NEW_SEAT":
        return errorResponse("Ghế mới không hợp lệ", null, 409);

      case "NEW_SEAT_ALREADY_BOOKED":
        return errorResponse("Một hoặc nhiều ghế đã được đặt", null, 409);

      case "NEW_SEAT_ALREADY_HELD":
        return errorResponse(
          "Một hoặc nhiều ghế đang được giữ bởi người khác",
          null,
          409,
        );

      case "CHANGE_PAYMENT_REQUIRED":
        return errorResponse(
          "Cần thanh toán thêm tiền trước khi đổi vé",
          null,
          409,
        );

      case "WALLET_NOT_FOUND":
        return errorResponse("Không tìm thấy ví nội bộ", null, 404);

      case "WALLET_LOCKED":
        return errorResponse("Ví nội bộ đang bị khóa", null, 409);
      case "NEW_TRIP_DIFFERENT_ROUTE":
        return errorResponse(
          "Chuyến mới phải thuộc cùng tuyến với chuyến hiện tại",
          null,
          409,
        );
      default:
        return errorResponse("Không thể đổi vé", null, 500);
    }
  }
}
