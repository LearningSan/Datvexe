import { NextResponse } from "next/server";
import { refreshAuth } from "@/services/server/client/auth.service";
import {
  getRefreshCookie,
  setRefreshCookie,
  clearRefreshCookie,
} from "@/lib/server/cookie";

export async function POST() {
  try {
    const refreshToken = await getRefreshCookie();

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

    setRefreshCookie(res, result.refreshToken);

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

    clearRefreshCookie(res);

    return res;
  }
}
