import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";
import { getTripFilterOptionsService } from "@/services/server/client/trip.service";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const originCityId = Number(searchParams.get("origin"));

    const destinationCityId = Number(searchParams.get("destination"));

    const date = searchParams.get("date") ?? "";

    const requiredSeats = Number(searchParams.get("requiredSeats") ?? 1);

    const data = await getTripFilterOptionsService({
      originCityId,
      destinationCityId,
      date,
      requiredSeats,
    });

    return successResponse(data, "Trip filter options fetched successfully");
  } catch (error: any) {
    return errorResponse(
      error.message || "Không thể lấy bộ lọc chuyến xe",
      null,
      500,
    );
  }
}
