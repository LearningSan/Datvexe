import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const bookingId = url.searchParams.get("bookingId");

  return NextResponse.redirect(
    new URL(`/payment/${bookingId ?? ""}?result=return`, req.url),
  );
}
