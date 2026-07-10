import { NextRequest, NextResponse } from "next/server";
import { VNPay, ignoreLogger } from "vnpay";
import { withTransaction } from "@/lib/server/mysql";
import { confirmPaymentByTransactionCode } from "@/services/server/client/payment-confirm.service";

export async function GET(req: NextRequest) {
  try {
    const params = Object.fromEntries(req.nextUrl.searchParams.entries());

    const vnpay = new VNPay({
      tmnCode: process.env.VNPAY_TMN_CODE!,
      secureSecret: process.env.VNPAY_SECURE_SECRET!,
      vnpayHost: process.env.VNPAY_PAYMENT_URL!,
      testMode: true,
      loggerFn: ignoreLogger,
    });

    const verify = vnpay.verifyIpnCall(params as any);

    if (!verify.isVerified) {
      return NextResponse.json({
        RspCode: "97",
        Message: "Invalid signature",
      });
    }

    await withTransaction(async (conn) => {
      await confirmPaymentByTransactionCode({
        conn,
        transactionCode: String(params.vnp_TxnRef),
        status:
          params.vnp_ResponseCode === "00" &&
          params.vnp_TransactionStatus === "00"
            ? "SUCCESS"
            : "FAILED",
        amount: Number(params.vnp_Amount) / 100,
        gatewayTransactionId: String(params.vnp_TransactionNo || ""),
        gatewayResponse: params,
      });
    });

    return NextResponse.json({
      RspCode: "00",
      Message: "Confirm Success",
    });
  } catch (error) {
    console.error("[VNPAY IPN ERROR]", error);

    return NextResponse.json({
      RspCode: "99",
      Message: "Unknown error",
    });
  }
}
