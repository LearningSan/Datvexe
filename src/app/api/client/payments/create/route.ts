import { NextRequest } from "next/server";
import { createPaymentSchema } from "@/validators/client/payment.validator";
import { createPayment } from "@/services/server/client/payment.service";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const payload = createPaymentSchema.parse(body);
    const data = await createPayment(payload);

    return successResponse(data);
  } catch (error: any) {
    console.error("[CREATE PAYMENT ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(
        error.errors?.[0]?.message || "Payload không hợp lệ",
        null, 
        400,
      );
    }

    return errorResponse(error.message || "Create payment failed", null, 500);
  }
}
