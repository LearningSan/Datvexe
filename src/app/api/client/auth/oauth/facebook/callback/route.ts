import { NextRequest, NextResponse } from "next/server";
import { loginOAuth } from "@/services/server/client/auth.service";
import { setRefreshCookie } from "@/lib/server/cookie";

interface FacebookTokenResponse {
  access_token: string;
}

interface FacebookProfile {
  id: string;
  name: string;
  email?: string;
  picture?: {
    data?: {
      url?: string;
    };
  };
}

export async function GET(req: NextRequest) {
  try {
    const code = req.nextUrl.searchParams.get("code");
    const state = req.nextUrl.searchParams.get("state");
    const savedState = req.cookies.get("oauth_state")?.value;

    if (!code || !state || state !== savedState) {
      return NextResponse.redirect(
        `${process.env.APP_URL}/home?auth=oauth_failed`,
      );
    }

    const tokenParams = new URLSearchParams({
      client_id: process.env.FACEBOOK_CLIENT_ID!,
      client_secret: process.env.FACEBOOK_CLIENT_SECRET!,
      redirect_uri: `${process.env.APP_URL}/api/client/auth/oauth/facebook/callback`,
      code,
    });

    const tokenRes = await fetch(
      `https://graph.facebook.com/v20.0/oauth/access_token?${tokenParams.toString()}`,
    );

    if (!tokenRes.ok) {
      console.error("FACEBOOK TOKEN ERROR", await tokenRes.text());
      throw new Error("FACEBOOK_TOKEN_FAILED");
    }

    const tokenData = (await tokenRes.json()) as FacebookTokenResponse;

    const profileParams = new URLSearchParams({
      fields: "id,name,email,picture",
      access_token: tokenData.access_token,
    });

    const profileRes = await fetch(
      `https://graph.facebook.com/me?${profileParams.toString()}`,
    );

    if (!profileRes.ok) {
      console.error("FACEBOOK PROFILE ERROR", await profileRes.text());
      throw new Error("FACEBOOK_PROFILE_FAILED");
    }

    const profile = (await profileRes.json()) as FacebookProfile;

    const result = await loginOAuth({
      provider: "FACEBOOK",
      providerId: profile.id,
      fullName: profile.name,
      email: profile.email ?? null,
      avatarUrl: profile.picture?.data?.url ?? null,
      userAgent: req.headers.get("user-agent"),
      ipAddress: req.headers.get("x-forwarded-for"),
    });

    const res = NextResponse.redirect(
      `${process.env.APP_URL}/home?auth=success`,
    );

    setRefreshCookie(res, result.refreshToken);

    res.cookies.set("oauth_state", "", {
      path: "/",
      maxAge: 0,
    });

    return res;
  } catch (error) {
    console.error("[FACEBOOK OAUTH ERROR]", error);
    return NextResponse.redirect(
      `${process.env.APP_URL}/home?auth=oauth_failed`,
    );
  }
}
