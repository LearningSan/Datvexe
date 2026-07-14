import { NextRequest, NextResponse } from "next/server";

import { getDemoPaymentSession } from "@/services/server/client/demo-payment.service";

export async function GET(request: NextRequest) {
  try {
    const token = request.nextUrl.searchParams.get("token") ?? "";

    const data = await getDemoPaymentSession(token);

    return NextResponse.json({
      success: true,
      message: "Lấy thông tin thanh toán demo thành công",
      data,
    });
  } catch (error: unknown) {
    console.error("[GET DEMO PAYMENT SESSION ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không lấy được phiên thanh toán",
        data: null,
      },
      { status: 400 },
    );
  }
}
