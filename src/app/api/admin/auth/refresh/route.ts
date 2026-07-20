import { NextResponse } from "next/server";

import {
  clearAdminRefreshCookie,
  getAdminRefreshCookie,
  setAdminRefreshCookie,
} from "@/lib/server/admin-cookie";

import { isAdminAuthError } from "@/services/server/admin/admin-auth-error";

import { refreshAdminSession } from "@/services/server/admin/admin-auth.service";

export async function POST() {
  try {
    const refreshToken = await getAdminRefreshCookie();

    if (!refreshToken) {
      return NextResponse.json(
        {
          message: "Không tìm thấy phiên đăng nhập quản trị",
          code: "UNAUTHORIZED",
        },
        {
          status: 401,
        },
      );
    }

    const result = await refreshAdminSession(refreshToken);

    const response = NextResponse.json(
      {
        message: "Khôi phục phiên quản trị thành công",
        data: result.data,
      },
      {
        status: 200,
      },
    );

    setAdminRefreshCookie(response, result.refreshToken);

    return response;
  } catch (error: unknown) {
    console.error("[ADMIN REFRESH ERROR]", error);

    const response = NextResponse.json(
      {
        message: isAdminAuthError(error)
          ? error.message
          : "Không thể khôi phục phiên quản trị",

        code: isAdminAuthError(error) ? error.code : "UNAUTHORIZED",
      },
      {
        status: isAdminAuthError(error) ? error.statusCode : 401,
      },
    );

    clearAdminRefreshCookie(response);

    return response;
  }
}
