import { NextRequest } from "next/server";

import { successResponse, errorResponse } from "@/lib/server/response";

import { getScheduleRoutesService } from "@/services/server/client/trip.service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const originValue = searchParams.get("originCityId");
    const destinationValue = searchParams.get("destinationCityId");

    const originCityId = originValue ? Number(originValue) : undefined;

    const destinationCityId = destinationValue
      ? Number(destinationValue)
      : undefined;

    const vehicleTypes = searchParams
      .getAll("vehicleTypes")
      .map((item) => item.trim())
      .filter(Boolean);

    const page = Math.max(Number(searchParams.get("page") ?? 1), 1);

    const limit = Math.min(
      Math.max(Number(searchParams.get("limit") ?? 10), 1),
      50,
    );

    if (
      originValue &&
      (!Number.isInteger(originCityId) || Number(originCityId) <= 0)
    ) {
      return errorResponse("Điểm đi không hợp lệ", null, 400);
    }

    if (
      destinationValue &&
      (!Number.isInteger(destinationCityId) || Number(destinationCityId) <= 0)
    ) {
      return errorResponse("Điểm đến không hợp lệ", null, 400);
    }

    const data = await getScheduleRoutesService({
      originCityId,
      destinationCityId,
      vehicleTypes,
      page,
      limit,
    });

    return successResponse(data, "Lấy danh sách lịch trình thành công");
  } catch (error: unknown) {
    console.error("[GET SCHEDULE ROUTES ERROR]", error);

    if (error instanceof Error) {
      if (error.message === "Điểm đi và điểm đến không được trùng nhau") {
        return errorResponse(error.message, null, 400);
      }

      return errorResponse(error.message, null, 500);
    }

    return errorResponse("Không thể tải danh sách lịch trình", null, 500);
  }
}
