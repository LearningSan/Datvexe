import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/server/response";

import { validatePromotionService } from "@/services/server/client/promotion.service";

import { validatePromotionSchema } from "@/validators/client/promotion.validator";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const validated = validatePromotionSchema.parse(body);

    const result = await validatePromotionService(validated);

    return successResponse(result);
  } catch (error: any) {
    if (error.name === "ZodError") {
      return errorResponse(
        "Validation failed",
        error.flatten().fieldErrors,
        400,
      );
    }

    return errorResponse(error.message || "Invalid promotion", null, 500);
  }
}
