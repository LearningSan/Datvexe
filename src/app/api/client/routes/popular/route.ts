import { NextRequest } from "next/server";

import {
    successResponse,
    errorResponse
} from "@/lib/server/response";

import {
    getPopularRoutes
} from "@/services/server/client/route.service";

export async function GET(req: NextRequest) {

    try {

        const routes = await getPopularRoutes();

        return successResponse(routes);

    } catch (error) {

        console.error(error);

        return errorResponse(
            "Failed to fetch popular routes"
        );
    }
}