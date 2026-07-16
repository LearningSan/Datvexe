import { NextRequest, NextResponse } from "next/server";

import type { Webhook } from "@payos/node";

import { getPayosClient } from "@/services/server/client/payment-gateway.service";

import { confirmPayosWalletTopup } from "@/services/server/client/wallet-topup.service";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Wallet PayOS webhook endpoint is running",
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Webhook;

    const payOS = getPayosClient();

    const verified = await payOS.webhooks.verify(body);

    const orderCode = Number(verified.orderCode);

    const amount = Number(verified.amount);

    if (!Number.isFinite(orderCode) || orderCode <= 0) {
      throw new Error("orderCode PayOS không hợp lệ");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Số tiền PayOS không hợp lệ");
    }

    const gatewayTransactionId =
      typeof verified.reference === "string" && verified.reference.trim()
        ? verified.reference.trim()
        : typeof verified.paymentLinkId === "string" &&
            verified.paymentLinkId.trim()
          ? verified.paymentLinkId.trim()
          : String(orderCode);

    const result = await confirmPayosWalletTopup({
      providerOrderCode: String(orderCode),
      amount,
      gatewayTransactionId,
      gatewayResponse: body,
    });

    return NextResponse.json({
      success: true,
      message: "Webhook nạp ví đã được xử lý",
      data: result,
    });
  } catch (error: unknown) {
    console.error("[WALLET PAYOS WEBHOOK ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Webhook nạp ví không hợp lệ",
      },
      { status: 400 },
    );
  }
}
