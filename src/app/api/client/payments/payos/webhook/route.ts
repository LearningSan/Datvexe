import { NextResponse } from "next/server";
import { PayOS } from "@payos/node";

import { withTransaction } from "@/lib/server/mysql";

import { findPaymentByProviderOrderCode } from "@/repositories/client/payment.repo";

import {
  confirmPaymentByTransactionCode,
  sendPaymentResultSideEffects,
} from "@/services/server/client/payment-confirm.service";

const payOS = new PayOS({
  clientId: process.env.PAYOS_CLIENT_ID!,
  apiKey: process.env.PAYOS_API_KEY!,
  checksumKey: process.env.PAYOS_CHECKSUM_KEY!,
});

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // Xác minh chữ ký webhook PayOS.
    const webhookData = await payOS.webhooks.verify(body);

    const orderCode = String(webhookData.orderCode);
    const amount = Number(webhookData.amount);

    const payment = await findPaymentByProviderOrderCode(orderCode);

    if (!payment) {
      console.error("[PAYOS WEBHOOK] Không tìm thấy payment:", {
        orderCode,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Không tìm thấy giao dịch",
        },
        { status: 404 },
      );
    }

    const isPaid = webhookData.code === "00";

    const result = await withTransaction(async (conn) => {
      return confirmPaymentByTransactionCode({
        conn,

        // Dùng transactionCode nội bộ lấy từ database.
        transactionCode: payment.transactionCode,

        status: isPaid ? "SUCCESS" : "FAILED",
        amount,

        gatewayTransactionId:
          webhookData.reference || webhookData.paymentLinkId || orderCode,

        gatewayResponse: body,
      });
    });

    if (!result.alreadyProcessed) {
      await sendPaymentResultSideEffects({
        bookingId: result.bookingId,
        isPaid,
      });
    }

    return NextResponse.json({
      success: true,
      message: "Webhook PayOS đã được xử lý",
    });
  } catch (error) {
    console.error("[PAYOS WEBHOOK ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error ? error.message : "Webhook PayOS không hợp lệ",
      },
      { status: 400 },
    );
  }
}
