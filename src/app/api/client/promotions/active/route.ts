import { NextRequest } from "next/server";

import { successResponse, errorResponse } from "@/lib/server/response";

import { getActivePromotions } from "@/services/server/client/promotion.service";

export async function GET(req: NextRequest) {
  try {
    const promotions = await getActivePromotions();

    return successResponse(promotions);
  } catch (error) {
    console.error(error);

    return errorResponse("Failed to fetch promotions");
  }
}
