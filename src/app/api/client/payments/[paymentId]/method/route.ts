import { NextRequest } from "next/server";
import { updatePaymentMethodSchema } from "@/validators/client/payment.validator";
import { updatePaymentMethod } from "@/services/server/client/payment.service";
import { successResponse, errorResponse } from "@/lib/server/response";

interface Context {
  params: Promise<{ paymentId: string }>;
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    const params = await context.params;
    const body = await req.json();

    const payload = updatePaymentMethodSchema.parse({
      ...body,
      paymentId: params.paymentId,
    });

    const data = await updatePaymentMethod(payload);

    return successResponse(data);
  } catch (error: any) {
    console.error("[UPDATE PAYMENT METHOD ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(
        error.errors?.[0]?.message || "Dữ liệu không hợp lệ",
        null,
        400,
      );
    }

    return errorResponse(
      error.message || "Failed to update payment method",
      null,
      500,
    );
  }
}
