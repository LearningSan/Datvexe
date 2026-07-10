import { NextRequest } from "next/server";

import { getCities } from "@/services/server/client/route.service";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function GET(req: NextRequest) {
    try {
        const cities = await getCities();
        return successResponse(cities);
    } catch (error) {
        console.error(error);
        return errorResponse("Failed to fetch cities");
    }
}