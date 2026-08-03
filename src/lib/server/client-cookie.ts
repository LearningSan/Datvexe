import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const CLIENT_REFRESH_COOKIE = "client_refresh_token";

export function setClientRefreshCookie(
  res: NextResponse,
  token: string,
) {
  res.cookies.set(CLIENT_REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function getClientRefreshCookie() {
  const cookieStore = await cookies();

  return cookieStore.get(CLIENT_REFRESH_COOKIE)?.value ?? null;
}

export function clearClientRefreshCookie(res: NextResponse) {
  res.cookies.set(CLIENT_REFRESH_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}