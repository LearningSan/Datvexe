import { NextRequest, NextResponse } from "next/server";
import { VNPay, ignoreLogger } from "vnpay";

export async function GET(req: NextRequest) {
  const params = Object.fromEntries(req.nextUrl.searchParams.entries());

  const vnpay = new VNPay({
    tmnCode: process.env.VNPAY_TMN_CODE!,
    secureSecret: process.env.VNPAY_SECURE_SECRET!,
    vnpayHost: process.env.VNPAY_PAYMENT_URL!,
    testMode: true,
    loggerFn: ignoreLogger,
  });

  const verify = vnpay.verifyReturnUrl(params as any);

  const result = verify.isSuccess ? "success" : "failed";

  return NextResponse.redirect(
    new URL(
      `/client/payment/result?result=${result}&transactionCode=${params.vnp_TxnRef}`,
      req.url,
    ),
  );
}
