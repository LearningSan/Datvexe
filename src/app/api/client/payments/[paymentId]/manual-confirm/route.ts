import { NextRequest } from "next/server";
import { z } from "zod";

import { successResponse, errorResponse } from "@/lib/server/response";

import { getAuthUserId } from "@/lib/server/auth-user";

import { customerConfirmManualPayment } from "@/services/server/client/payment.service";

interface Context {
  params: Promise<{
    paymentId: string;
  }>;
}

const schema = z.object({
  note: z.string().trim().max(255).optional(),
});

export async function POST(req: NextRequest, context: Context) {
  try {
    const userId = await getAuthUserId(req);

    if (!userId) {
      return errorResponse(
        "Bạn cần đăng nhập để thanh toán bằng ví nội bộ",
        null,
        401,
      );
    }

    const { paymentId: paymentIdParam } = await context.params;

    const paymentId = Number(paymentIdParam);

    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return errorResponse("paymentId không hợp lệ", null, 400);
    }

    const body = await req.json().catch(() => ({}));

    const payload = schema.parse(body);

    const data = await customerConfirmManualPayment({
      paymentId,
      userId: Number(userId),
      note: payload.note ?? null,
    });

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[MANUAL CONFIRM PAYMENT ERROR]", error);

    if (error instanceof z.ZodError) {
      return errorResponse(
        error.issues[0]?.message || "Dữ liệu không hợp lệ",
        null,
        400,
      );
    }

    const message =
      error instanceof Error ? error.message : "Xác nhận thanh toán thất bại";

    const status =
      message === "Bạn không có quyền thanh toán booking này"
        ? 403
        : message.includes("không đủ")
          ? 400
          : 500;

    return errorResponse(message, null, status);
  }
}
