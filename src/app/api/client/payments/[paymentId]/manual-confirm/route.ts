import { NextRequest } from "next/server";
import { z } from "zod";
import { successResponse, errorResponse } from "@/lib/server/response";
import { customerConfirmManualPayment } from "@/services/server/client/payment.service";

interface Context {
  params: Promise<{ paymentId: string }>;
}

const schema = z.object({
  note: z.string().max(255).optional(),
});

export async function POST(req: NextRequest, context: Context) {
  try {
    const params = await context.params;
    const body = await req.json().catch(() => ({}));

    const paymentId = Number(params.paymentId);

    if (!Number.isFinite(paymentId) || paymentId <= 0) {
      return errorResponse("paymentId không hợp lệ", null, 400);
    }

    const payload = schema.parse(body);

    const data = await customerConfirmManualPayment({
      paymentId,
      note: payload.note ?? null,
    });

    return successResponse(data);
  } catch (error: any) {
    console.error("[MANUAL CONFIRM PAYMENT ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(
        error.errors?.[0]?.message || "Dữ liệu không hợp lệ",
        null,
        400,
      );
    }

    return errorResponse(
      error.message || "Xác nhận thanh toán thất bại",
      null,
      500,
    );
  }
}
