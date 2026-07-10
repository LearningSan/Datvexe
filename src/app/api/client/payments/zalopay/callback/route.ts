import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { withTransaction } from "@/lib/server/mysql";
import { findPaymentByProviderOrderCode } from "@/repositories/client/payment.repo";
import { confirmPaymentByTransactionCode } from "@/services/server/client/payment-confirm.service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const data = body.data;
    const reqMac = body.mac;

    const mac = crypto
      .createHmac("sha256", process.env.ZALOPAY_KEY2!)
      .update(data)
      .digest("hex");

    if (mac !== reqMac) {
      return NextResponse.json({
        return_code: -1,
        return_message: "Invalid mac",
      });
    }

    const parsed = JSON.parse(data);

    const payment = await findPaymentByProviderOrderCode(parsed.app_trans_id);

    if (!payment) {
      return NextResponse.json({
        return_code: 0,
        return_message: "Payment not found",
      });
    }

    await withTransaction(async (conn) => {
      await confirmPaymentByTransactionCode({
        conn,
        transactionCode: payment.transactionCode,
        status: "SUCCESS",
        amount: Number(parsed.amount),
        gatewayTransactionId: String(parsed.zp_trans_id || ""),
        gatewayResponse: body,
      });
    });

    return NextResponse.json({
      return_code: 1,
      return_message: "success",
    });
  } catch (error) {
    console.error("[ZALOPAY CALLBACK ERROR]", error);

    return NextResponse.json({
      return_code: 0,
      return_message: "callback failed",
    });
  }
}
