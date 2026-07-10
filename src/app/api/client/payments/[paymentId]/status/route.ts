import { NextRequest } from "next/server";
import { paymentStatusParamsSchema } from "@/validators/client/payment.validator";
import { getPaymentStatus } from "@/services/server/client/payment.service";
import { successResponse, errorResponse } from "@/lib/server/response";

interface Context {
  params: Promise<{ paymentId: string }>;
}

export async function GET(_req: NextRequest, context: Context) {
  try {
    const params = await context.params;
    const parsed = paymentStatusParamsSchema.parse(params);

    const data = await getPaymentStatus(parsed.paymentId);

    return successResponse(data);
  } catch (error: any) {
    console.error("[PAYMENT STATUS ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(
        error.errors?.[0]?.message || "paymentId không hợp lệ",
        null,
        400,
      );
    }

    return errorResponse(
      error.message || "Failed to get payment status",
      null,
      500,
    );
  }
}
