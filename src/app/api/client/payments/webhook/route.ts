import { NextRequest } from "next/server";

import { successResponse, errorResponse } from "@/lib/server/response";

import { paymentWebhookSchema } from "@/validators/client/payment.validator";

import { handlePaymentWebhook } from "@/services/server/client/payment-webhook.service";

function verifyWebhookSignature(req: NextRequest): boolean {
  if (process.env.NODE_ENV === "development") {
    return true;
  }

  const secret = req.headers.get("x-webhook-secret");

  return secret === process.env.PAYMENT_WEBHOOK_SECRET;
}

export async function POST(req: NextRequest) {
  if (!verifyWebhookSignature(req)) {
    return errorResponse("Unauthorized webhook", null, 401);
  }

  try {
    const body = await req.json();

    const payload = paymentWebhookSchema.parse(body);

    const result = await handlePaymentWebhook(payload);

    return successResponse(result);
  } catch (error: any) {
    console.error("[PAYMENT WEBHOOK ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(
        error.errors?.[0]?.message || "Invalid webhook payload",
        null,
        400,
      );
    }

    if (error.message === "Transaction không tồn tại") {
      return errorResponse(error.message, null, 404);
    }

    return errorResponse(
      error.message || "Webhook processing failed",
      null,
      500,
    );
  }
}
