import { NextResponse } from "next/server";
import crypto from "crypto";

export async function GET() {
  const state = crypto.randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_CLIENT_ID!,
    redirect_uri: `${process.env.APP_URL}/api/client/auth/oauth/facebook/callback`,
    response_type: "code",
    scope: "email,public_profile",
    state,
  });

  const res = NextResponse.redirect(
    `https://www.facebook.com/v20.0/dialog/oauth?${params.toString()}`,
  );

  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return res;
}
