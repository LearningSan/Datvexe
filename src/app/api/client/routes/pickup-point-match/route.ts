import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/server/response";

import { getPickupPointMatch } from "@/services/server/client/route.service";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    const label = searchParams.get("label");

    const cityId = Number(searchParams.get("cityId"));

    if (!label || !cityId) {
      return errorResponse("Missing params", null, 400);
    }

    const result = await getPickupPointMatch(label, cityId);

    return successResponse(result);
  } catch (error: any) {
    console.error(error);

    return errorResponse(
      error.message || "Failed to match pickup point",
      null,
      500,
    );
  }
}
