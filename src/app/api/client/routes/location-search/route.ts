import { NextRequest } from "next/server";

import { searchLocations } from "@/services/server/client/route.service";

import { successResponse, errorResponse } from "@/lib/server/response";

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;

    const keyword = searchParams.get("q") || "";
    const data = await searchLocations(keyword);

    return successResponse(data);
  } catch (error) {
    console.error(error);

    return errorResponse("Failed to search locations");
  }
}
