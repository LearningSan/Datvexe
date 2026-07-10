import { NextRequest } from "next/server";

import { getZonesByCityId } from "@/services/server/client/route.service";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);

        const cityId = Number(searchParams.get("cityId"));

        if (!cityId) {
            return errorResponse("cityId is required");
        }

        const zones = await getZonesByCityId(cityId);

        return successResponse(zones);
    } catch (error) {
        console.error(error);
        return errorResponse("Failed to fetch zones");
    }
}