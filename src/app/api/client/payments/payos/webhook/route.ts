import { NextRequest, NextResponse } from "next/server";

import { withTransaction } from "@/lib/server/mysql";

import { getPayosClient } from "@/services/server/client/payment-gateway.service";

import {
  confirmPaymentByTransactionCode,
  sendPaymentResultSideEffects,
} from "@/services/server/client/payment-webhook.service";

import { findPaymentByProviderOrderCode } from "@/repositories/client/payment.repo";

export async function GET() {
  return NextResponse.json(
    {
      success: true,
      message: "PayOS webhook endpoint is running",
      method: "POST",
    },
    { status: 200 },
  );
}

export async function POST(request: NextRequest) {
  const payOS = getPayosClient();

  type PayosWebhookInput = Parameters<typeof payOS.webhooks.verify>[0];

  let body: PayosWebhookInput;

  try {
    body = (await request.json()) as PayosWebhookInput;
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Request body không phải JSON hợp lệ",
      },
      { status: 400 },
    );
  }

  console.log("[PAYOS WEBHOOK RECEIVED]", JSON.stringify(body));

  try {
    /*
     * verify có thể là async tùy phiên bản SDK,
     * dùng await vẫn an toàn.
     */
    const verifiedData = await payOS.webhooks.verify(body);

    const orderCode = Number(verifiedData.orderCode);

    const amount = Number(verifiedData.amount);

    if (!Number.isFinite(orderCode) || orderCode <= 0) {
      throw new Error("orderCode PayOS không hợp lệ");
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Số tiền PayOS không hợp lệ");
    }

    /*
     * orderCode PayOS được lưu trong
     * payments.provider_order_code.
     */
    const payment = await findPaymentByProviderOrderCode(String(orderCode));

    /*
     * PayOS có thể gửi webhook kiểm tra URL.
     * Payload đã verify nhưng chưa có payment tương ứng.
     */
    if (!payment) {
      console.log("[PAYOS WEBHOOK TEST ACCEPTED]", {
        orderCode,
        amount,
      });

      return NextResponse.json(
        {
          success: true,
          message: "Webhook endpoint hoạt động",
        },
        { status: 200 },
      );
    }

    const reference =
      typeof verifiedData.reference === "string"
        ? verifiedData.reference.trim()
        : "";

    /*
     * Không phải mọi phiên bản type PayOS đều khai báo
     * paymentLinkId trên verifiedData.
     *
     * orderCode đủ làm fallback.
     */
    const gatewayTransactionId = reference || String(orderCode);

    const result = await withTransaction(async (conn) => {
      return confirmPaymentByTransactionCode({
        conn,
        transactionCode: payment.transactionCode,
        status: "SUCCESS",
        amount,
        gatewayTransactionId,
        gatewayResponse: body,
      });
    });

    /*
     * Gửi mail và notification sau khi transaction commit.
     */
    if (!result.alreadyProcessed) {
      try {
        await sendPaymentResultSideEffects({
          bookingId: result.bookingId,
          isPaid: true,
        });
      } catch (sideEffectError) {
        console.error("[PAYOS SIDE EFFECT ERROR]", sideEffectError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Webhook PayOS đã được xử lý",
      },
      { status: 200 },
    );
  } catch (error: unknown) {
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
