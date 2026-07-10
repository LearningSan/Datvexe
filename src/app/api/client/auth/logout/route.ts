import { NextResponse } from "next/server";
import { getRefreshCookie, clearRefreshCookie } from "@/lib/server/cookie";
import { logoutAuth } from "@/services/server/client/auth.service";

export async function POST() {
  try {
    const refreshToken = await getRefreshCookie();

    await logoutAuth(refreshToken);

    const res = NextResponse.json({
      success: true,
      message: "Đăng xuất thành công",
      data: {
        success: true,
      },
    });

    clearRefreshCookie(res);

    return res;
  } catch (error) {
    console.error("[LOGOUT ERROR]", error);

    const res = NextResponse.json({
      success: true,
      message: "Đã xóa phiên đăng nhập phía client",
      data: {
        success: true,
      },
    });

    clearRefreshCookie(res);

    return res;
  }
}
