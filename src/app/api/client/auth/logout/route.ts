import { NextResponse } from "next/server";
import { getClientRefreshCookie, clearClientRefreshCookie } from "@/lib/server/client-cookie";
import { logoutAuth } from "@/services/server/client/auth.service";

export async function POST() {
  try {
    const refreshToken = await getClientRefreshCookie();

    await logoutAuth(refreshToken);

    const res = NextResponse.json({
      success: true,
      message: "Đăng xuất thành công",
      data: {
        success: true,
      },
    });

    clearClientRefreshCookie(res);

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

    clearClientRefreshCookie(res);

    return res;
  }
}
