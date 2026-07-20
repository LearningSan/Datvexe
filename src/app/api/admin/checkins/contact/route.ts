import { NextRequest, NextResponse } from "next/server";

import { ZodError } from "zod";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { updatePassengerContactSchema } from "@/validators/admin/checkin/checkin-contact.validator";

import { updatePassengerContact } from "@/services/server/admin/checkin/admin-checkin-contact.service";

export async function POST(request: NextRequest) {
  try {
    const adminUserId = await getAdminAuthUserId(request);
    const body = await request.json();

    const payload = updatePassengerContactSchema.parse(body);

    const result = await updatePassengerContact({
      ...payload,

      contactedBy: adminUserId,
    });

    return NextResponse.json(result, {
      status: 200,
    });
  } catch (error: unknown) {
    console.error("[UPDATE PASSENGER CONTACT ERROR]", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        {
          message: "Phiên đăng nhập quản trị không hợp lệ",
        },
        {
          status: 401,
        },
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          message: "Dữ liệu JSON không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "Dữ liệu liên hệ không hợp lệ",

          errors: error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Không thể cập nhật kết quả liên hệ";

    const businessErrors = [
      "Không tìm thấy booking trong chuyến xe này",
      "Booking đã bị hủy",
      "Booking đã được hoàn tiền",
      "Booking chưa được xác nhận",
      "Booking chưa thanh toán thành công",
      "Chuyến xe đã bị hủy",
      "Chuyến xe đã hoàn thành",
      "Booking không còn ghế nào đang chờ check-in",
      "Phải nhập lý do khách yêu cầu hủy vé",
      "Phải nhập thời gian khách dự kiến đến",
      "Thời gian khách dự kiến đến không hợp lệ",
      "Thời gian khách dự kiến đến phải lớn hơn thời gian hiện tại",
    ];

    return NextResponse.json(
      {
        message,
      },
      {
        status: businessErrors.includes(message) ? 400 : 500,
      },
    );
  }
}
