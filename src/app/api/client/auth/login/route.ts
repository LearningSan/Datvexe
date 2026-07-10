import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/validators/client/auth.validator";
import { loginLocal } from "@/services/server/client/auth.service";
import { setRefreshCookie } from "@/lib/server/cookie";
import { errorResponse } from "@/lib/server/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = loginSchema.parse(body);

    const result = await loginLocal({
      identifier: payload.identifier,
      password: payload.password,
      userAgent: req.headers.get("user-agent"),
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    const res = NextResponse.json({
      success: true,
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });

    setRefreshCookie(res, result.refreshToken);

    return res;
  } catch (error: any) {
    console.error("[LOGIN ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(
        error.errors[0]?.message || "Dữ liệu không hợp lệ",
        null,
        400,
      );
    }

    return errorResponse(error.message || "Đăng nhập thất bại", null, 401);
  }
}
