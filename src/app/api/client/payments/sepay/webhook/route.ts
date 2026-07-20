import { NextRequest, NextResponse } from "next/server";

import { handlePaymentWebhook } from "@/services/server/client/payment-webhook.service";

type SePayWebhookPayload = {
  id: number;
  gateway: string;
  transactionDate: string;
  accountNumber: string;
  subAccount?: string | null;

  code?: string | null;
  content?: string | null;

  transferType: "in" | "out";
  description?: string | null;

  transferAmount: number;
  accumulated?: number;

  referenceCode?: string | null;
};

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function extractTransactionCode(payload: SePayWebhookPayload): string | null {
  const sources = [
    normalizeText(payload.code),
    normalizeText(payload.content),
    normalizeText(payload.description),
  ].filter(Boolean);

  for (const source of sources) {
    const match = source.match(/\bPAY[0-9A-Z]{10,30}\b/i);

    if (match) {
      return match[0];
    }
  }

  return null;
}

function getExpectedAuthorization(): string | null {
  const apiKey = process.env.SEPAY_WEBHOOK_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  return `Apikey ${apiKey}`;
}

export async function POST(req: NextRequest) {
  try {
    const expectedAuthorization = getExpectedAuthorization();

    if (!expectedAuthorization) {
      console.error("[SEPAY WEBHOOK CONFIG ERROR] Thiếu SEPAY_WEBHOOK_API_KEY");

      return NextResponse.json(
        {
          success: false,
          message: "Webhook chưa được cấu hình API Key",
        },
        {
          status: 500,
        },
      );
    }

    const authorization = req.headers.get("authorization")?.trim() ?? "";

    if (authorization !== expectedAuthorization) {
      console.warn("[SEPAY WEBHOOK UNAUTHORIZED]", {
        hasAuthorization: Boolean(authorization),
      });

      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }

    const payload = (await req.json()) as SePayWebhookPayload;

    console.log("[SEPAY WEBHOOK RECEIVED]", {
      id: payload.id,
      gateway: payload.gateway,
      accountNumber: payload.accountNumber,
      transferType: payload.transferType,
      transferAmount: payload.transferAmount,
      code: payload.code ?? null,
      content: payload.content ?? null,
      referenceCode: payload.referenceCode ?? null,
    });

    if (payload.transferType !== "in") {
      console.log("[SEPAY WEBHOOK IGNORED]", {
        id: payload.id,
        reason: "Không phải giao dịch tiền vào",
      });

      return NextResponse.json({
        success: true,
        ignored: true,
        reason: "Không phải giao dịch tiền vào",
      });
    }

    const amount = Number(payload.transferAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      console.warn("[SEPAY WEBHOOK INVALID AMOUNT]", {
        id: payload.id,
        transferAmount: payload.transferAmount,
      });

      return NextResponse.json(
        {
          success: false,
          message: "Số tiền giao dịch không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const transactionCode = extractTransactionCode(payload);

    if (!transactionCode) {
      console.log("[SEPAY WEBHOOK IGNORED]", {
        id: payload.id,
        reason: "Không tìm thấy mã PAY trong giao dịch",
        code: payload.code ?? null,
        content: payload.content ?? null,
      });

      return NextResponse.json({
        success: true,
        ignored: true,
        reason: "Không tìm thấy mã thanh toán PAY",
      });
    }

    const gatewayTransactionId =
      normalizeText(payload.referenceCode) ||
      `${payload.gateway}-${payload.id}`;

    const result = await handlePaymentWebhook({
      transactionCode,
      status: "SUCCESS",
      amount,
      gatewayTransactionId,
      gatewayResponse: payload,
    });

    console.log("[SEPAY WEBHOOK SUCCESS]", {
      sepayTransactionId: payload.id,
      transactionCode,
      bookingId: result.bookingId,
      alreadyProcessed: result.alreadyProcessed,
    });

    return NextResponse.json({
      success: true,
      data: {
        transactionCode,
        bookingId: result.bookingId,
        alreadyProcessed: result.alreadyProcessed,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Không thể xử lý webhook SePay";

    console.error("[SEPAY WEBHOOK ERROR]", {
      message,
      error,
    });

    return NextResponse.json(
      {
        success: false,
        message,
      },
      {
        status: 500,
      },
    );
  }
}
