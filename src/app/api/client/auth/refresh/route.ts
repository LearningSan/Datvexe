import { NextResponse } from "next/server";
import { refreshAuth } from "@/services/server/client/auth.service";
import {
  getClientRefreshCookie,
  setClientRefreshCookie,
  clearClientRefreshCookie,
} from "@/lib/server/client-cookie";

export async function POST() {
  try {
    const refreshToken = await getClientRefreshCookie();

    if (!refreshToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Chưa đăng nhập",
        },
        { status: 401 },
      );
    }

    const result = await refreshAuth(refreshToken);

    const res = NextResponse.json({
      success: true,
      message: "Làm mới phiên đăng nhập thành công",
      data: {
        accessToken: result.accessToken,
        user: result.user,
      },
    });

    setClientRefreshCookie(res, result.refreshToken);

    return res;
  } catch (error) {
    console.error("[REFRESH ERROR]", error);

    const res = NextResponse.json(
      {
        success: false,
        message: "Phiên đăng nhập không hợp lệ",
      },
      { status: 401 },
    );

    clearClientRefreshCookie(res);

    return res;
  }
}
