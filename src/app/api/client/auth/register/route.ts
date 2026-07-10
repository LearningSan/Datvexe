import { NextRequest } from "next/server";

import { registerSchema } from "@/validators/client/auth.validator";
import { registerLocal } from "@/services/server/client/auth.service";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = registerSchema.parse(body);

    const user = await registerLocal({
      fullName: payload.fullName,
      email: payload.email,
      phone: payload.phone,
      password: payload.password,
    });

    return successResponse({
      user,
      message: "Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP.",
    });
  } catch (error: any) {
    console.error("[REGISTER ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(
        error.errors?.[0]?.message || "Dữ liệu không hợp lệ",
        null,
        400,
      );
    }

    return errorResponse(error.message || "Đăng ký thất bại", null, 400);
  }
}
