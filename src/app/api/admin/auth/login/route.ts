import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ZodError } from "zod";

import { setAdminRefreshCookie } from "@/lib/server/admin-cookie";

import { isAdminAuthError } from "@/services/server/admin/admin-auth-error";

import { loginAdmin } from "@/services/server/admin/admin-auth.service";

import { adminLoginSchema } from "@/validators/admin/admin-auth.validator";

function getRequestIp(request: NextRequest): string | null {
  const forwardedFor = request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim().slice(0, 50) || null;
  }

  return request.headers.get("x-real-ip")?.trim().slice(0, 50) ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const body: unknown = await request.json();

    const payload = adminLoginSchema.parse(body);

    const result = await loginAdmin(payload, {
      userAgent: request.headers.get("user-agent")?.slice(0, 255) ?? null,

      ipAddress: getRequestIp(request),
    });

    const response = NextResponse.json(
      {
        message: "Đăng nhập quản trị thành công",
        data: result.data,
      },
      {
        status: 200,
      },
    );

    setAdminRefreshCookie(response, result.refreshToken);

    return response;
  } catch (error: unknown) {
    console.error("[ADMIN LOGIN ERROR]", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: error.issues[0]?.message ?? "Dữ liệu đăng nhập không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    if (isAdminAuthError(error)) {
      return NextResponse.json(
        {
          message: error.message,
          code: error.code,
        },
        {
          status: error.statusCode,
        },
      );
    }

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        {
          message: "Dữ liệu gửi lên không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        message: "Không thể đăng nhập quản trị",
      },
      {
        status: 500,
      },
    );
  }
}
