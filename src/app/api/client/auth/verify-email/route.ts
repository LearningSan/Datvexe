import { NextRequest, NextResponse } from "next/server";
import { verifyEmail } from "@/services/server/client/auth.service";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(`${process.env.APP_URL}/?verify=failed`);
  }

  try {
    await verifyEmail(token);
    return NextResponse.redirect(
      `${process.env.APP_URL}/?verify=email-success`,
    );
  } catch {
    return NextResponse.redirect(`${process.env.APP_URL}/?verify=failed`);
  }
}
