import { NextResponse } from "next/server";

import {
  clearAdminRefreshCookie,
  getAdminRefreshCookie,
} from "@/lib/server/admin-cookie";

import { logoutAdminSession } from "@/services/server/admin/admin-auth.service";

export async function POST() {
  const refreshToken = await getAdminRefreshCookie();

  await logoutAdminSession(refreshToken);

  const response = NextResponse.json(
    {
      message: "Đăng xuất quản trị thành công",
    },
    {
      status: 200,
    },
  );

  clearAdminRefreshCookie(response);

  return response;
}
