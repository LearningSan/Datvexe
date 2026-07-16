import { NextRequest } from "next/server";
import { z } from "zod";

import { successResponse, errorResponse } from "@/lib/server/response";

const contactSchema = z.object({
  fullName: z.string().trim().min(2, "Họ tên không hợp lệ").max(100),

  email: z.string().trim().email("Email không hợp lệ"),

  phone: z
    .string()
    .trim()
    .regex(/^(0|\+84)[0-9]{9,10}$/, "Số điện thoại không hợp lệ"),

  subject: z.enum([
    "SERVICE_FEEDBACK",
    "LOST_LUGGAGE",
    "COMPLAINT",
    "BOOKING_SUPPORT",
    "BUSINESS_PARTNERSHIP",
    "OTHER",
  ]),

  message: z
    .string()
    .trim()
    .min(10, "Nội dung phải có ít nhất 10 ký tự")
    .max(2000),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const parsed = contactSchema.safeParse(body);

    if (!parsed.success) {
      return errorResponse(
        "Thông tin liên hệ không hợp lệ",
        parsed.error.flatten().fieldErrors,
        400,
      );
    }

    console.log("[CONTACT REQUEST]", {
      ...parsed.data,
      createdAt: new Date().toISOString(),
    });

    /*
      Sau này có thể thay console.log bằng:
      - Gửi email cho admin.
      - Lưu vào bảng contact_requests.
      - Gửi thông báo nội bộ.
    */

    return successResponse(
      {
        received: true,
      },
      "Phản hồi của bạn đã được ghi nhận",
    );
  } catch (error) {
    console.error("[CONTACT REQUEST ERROR]", error);

    return errorResponse("Không thể gửi phản hồi", null, 500);
  }
}
