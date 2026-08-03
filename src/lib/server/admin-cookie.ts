import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const ADMIN_REFRESH_COOKIE = "admin_refresh_token";

export function setAdminRefreshCookie(
  res: NextResponse,
  token: string,
) {
  res.cookies.set(ADMIN_REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/admin",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getAdminRefreshCookie() {
  const cookieStore = await cookies();

  return cookieStore.get(ADMIN_REFRESH_COOKIE)?.value ?? null;
}

export function clearAdminRefreshCookie(res: NextResponse) {
  res.cookies.set(ADMIN_REFRESH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/api/admin",
    maxAge: 0,
  });
}