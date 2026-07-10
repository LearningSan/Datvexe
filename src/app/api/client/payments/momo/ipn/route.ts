import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { withTransaction } from "@/lib/server/mysql";
import { confirmPaymentByTransactionCode } from "@/services/server/client/payment-confirm.service";

function verifyMomoSignature(body: any) {
  const secretKey = process.env.MOMO_SECRET_KEY!;

  const rawSignature =
    `accessKey=${process.env.MOMO_ACCESS_KEY}` +
    `&amount=${body.amount}` +
    `&extraData=${body.extraData}` +
    `&message=${body.message}` +
    `&orderId=${body.orderId}` +
    `&orderInfo=${body.orderInfo}` +
    `&orderType=${body.orderType}` +
    `&partnerCode=${body.partnerCode}` +
    `&payType=${body.payType}` +
    `&requestId=${body.requestId}` +
    `&responseTime=${body.responseTime}` +
    `&resultCode=${body.resultCode}` +
    `&transId=${body.transId}`;

  const signature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  return signature === body.signature;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!verifyMomoSignature(body)) {
      return NextResponse.json(
        { message: "Invalid signature" },
        { status: 401 },
      );
    }

    await withTransaction(async (conn) => {
      await confirmPaymentByTransactionCode({
        conn,
        transactionCode: body.orderId,
        status: Number(body.resultCode) === 0 ? "SUCCESS" : "FAILED",
        amount: Number(body.amount),
        gatewayTransactionId: String(body.transId || ""),
        gatewayResponse: body,
      });
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[MOMO IPN ERROR]", error);
    return NextResponse.json({ message: "MoMo IPN failed" }, { status: 500 });
  }
}
