import { NextRequest } from "next/server";

import { successResponse, errorResponse } from "@/lib/server/response";

import { getOfficePickupPoints } from "@/services/server/client/route.service";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    const cityId = Number(searchParams.get("cityId"));
    const zoneId = Number(searchParams.get("zoneId"));

    if (!cityId || !zoneId) {
      return errorResponse("cityId and zoneId are required");
    }

    const data = await getOfficePickupPoints(cityId, zoneId);

    return successResponse(data);
  } catch (error) {
    console.error(error);

    return errorResponse("Failed to fetch office pickup points");
  }
}
