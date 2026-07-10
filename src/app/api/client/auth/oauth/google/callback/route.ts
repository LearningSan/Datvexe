import { NextRequest, NextResponse } from "next/server";
import { loginOAuth } from "@/services/server/client/auth.service";
import { setRefreshCookie } from "@/lib/server/cookie";

interface GoogleTokenResponse {
  access_token: string;
  id_token: string;
}

interface GoogleUserInfo {
  sub: string;
  name: string;
  email?: string;
  picture?: string;
}

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const savedState = req.cookies.get("oauth_state")?.value;

    if (!code || !state || state !== savedState) {
      return NextResponse.redirect(`${process.env.APP_URL}/?auth=oauth_failed`);
    }

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${process.env.APP_URL}/api/client/auth/oauth/google/callback`,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      console.error("GOOGLE TOKEN ERROR", await tokenRes.text());
      throw new Error("GOOGLE_TOKEN_FAILED");
    }

    const tokenData = (await tokenRes.json()) as GoogleTokenResponse;

    const userRes = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      },
    );

    if (!userRes.ok) {
      console.error("GOOGLE USERINFO ERROR", await userRes.text());
      throw new Error("GOOGLE_USERINFO_FAILED");
    }

    const profile = (await userRes.json()) as GoogleUserInfo;

    const result = await loginOAuth({
      provider: "GOOGLE",
      providerId: profile.sub,
      fullName: profile.name,
      email: profile.email ?? null,
      avatarUrl: profile.picture ?? null,
      userAgent: req.headers.get("user-agent"),
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    const res = NextResponse.redirect(`${process.env.APP_URL}/?auth=success`);

    setRefreshCookie(res, result.refreshToken);

    res.cookies.set("oauth_state", "", {
      path: "/",
      maxAge: 0,
    });

    return res;
  } catch (error) {
    console.error("[GOOGLE OAUTH ERROR]", error);
    return NextResponse.redirect(`${process.env.APP_URL}/?auth=oauth_failed`);
  }
}
