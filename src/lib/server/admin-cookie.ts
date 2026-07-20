import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

const DEFAULT_ADMIN_REFRESH_COOKIE = "admin_refresh";
const DEFAULT_ADMIN_REFRESH_MAX_AGE = 60 * 60 * 24 * 7;

const ADMIN_REFRESH_COOKIE =
  process.env.ADMIN_REFRESH_COOKIE_NAME?.trim() || DEFAULT_ADMIN_REFRESH_COOKIE;

const parsedMaxAge = Number(process.env.ADMIN_REFRESH_COOKIE_MAX_AGE);

const ADMIN_REFRESH_MAX_AGE =
  Number.isFinite(parsedMaxAge) && parsedMaxAge > 0
    ? parsedMaxAge
    : DEFAULT_ADMIN_REFRESH_MAX_AGE;

function getAdminCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/admin/auth",
  };
}

export function setAdminRefreshCookie(
  response: NextResponse,
  refreshToken: string,
) {
  response.cookies.set(ADMIN_REFRESH_COOKIE, refreshToken, {
    ...getAdminCookieOptions(),
    maxAge: ADMIN_REFRESH_MAX_AGE,
  });
}

export async function getAdminRefreshCookie(): Promise<string | null> {
  const cookieStore = await cookies();

  return cookieStore.get(ADMIN_REFRESH_COOKIE)?.value ?? null;
}

export function clearAdminRefreshCookie(response: NextResponse) {
  response.cookies.set(ADMIN_REFRESH_COOKIE, "", {
    ...getAdminCookieOptions(),
    maxAge: 0,
    expires: new Date(0),
  });
}
