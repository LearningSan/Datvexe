import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  verifyDemoPaymentInformation,
} from "@/services/server/client/demo-payment.service";

export async function POST(
  request: NextRequest,
) {
  try {
    const body = await request.json();

    const data =
      await verifyDemoPaymentInformation({
        token:
          typeof body.token === "string"
            ? body.token
            : "",

        provider: body.provider,

        amount: Number(body.amount),

        selectedBank:
          typeof body.selectedBank === "string"
            ? body.selectedBank
            : undefined,

        accountNumber:
          typeof body.accountNumber === "string"
            ? body.accountNumber
            : undefined,

        accountHolder:
          typeof body.accountHolder === "string"
            ? body.accountHolder
            : undefined,

        customerPhone:
          typeof body.customerPhone === "string"
            ? body.customerPhone
            : undefined,

        paymentSource:
          typeof body.paymentSource === "string"
            ? body.paymentSource
            : undefined,
      });

    return NextResponse.json({
      success: true,
      message:
        "Thông tin thanh toán hợp lệ",
      data,
    });
  } catch (error: unknown) {
    console.error(
      "[VERIFY DEMO PAYMENT ERROR]",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Thông tin thanh toán không hợp lệ",
        data: null,
      },
      { status: 400 },
    );
  }
}