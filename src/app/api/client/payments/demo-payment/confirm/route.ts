import { NextRequest, NextResponse } from "next/server";

import { confirmDemoPayment } from "@/services/server/client/demo-payment.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const data = await confirmDemoPayment({
      token: typeof body.token === "string" ? body.token : "",

      provider: body.provider,

      verificationCode:
        typeof body.verificationCode === "string" ? body.verificationCode : "",
    });

    return NextResponse.json({
      success: true,
      message: "Thanh toán demo thành công",
      data,
    });
  } catch (error: unknown) {
    console.error("[CONFIRM DEMO PAYMENT ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể hoàn tất thanh toán",
        data: null,
      },
      { status: 400 },
    );
  }
}
