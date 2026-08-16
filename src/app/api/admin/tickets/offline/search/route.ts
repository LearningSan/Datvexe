import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";

import { successResponse, errorResponse } from "@/lib/server/response";

import { searchAdminOfflineTrips } from "@/services/server/admin/admin-ticket.service";

function parsePositiveInt(value: string | null, fieldName: string) {
  const number = Number(value);

  if (!Number.isInteger(number) || number <= 0) {
    throw new Error(`${fieldName} không hợp lệ`);
  }

  return number;
}

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const searchParams = req.nextUrl.searchParams;

    const originCityId = parsePositiveInt(
      searchParams.get("originCityId"),
      "originCityId",
    );

    const destinationCityId = parsePositiveInt(
      searchParams.get("destinationCityId"),
      "destinationCityId",
    );

    const date = searchParams.get("date");

    if (!date) {
      throw new Error("Ngày khởi hành là bắt buộc");
    }

    const timeFrom = searchParams.get("timeFrom") || undefined;

    const timeTo = searchParams.get("timeTo") || undefined;

    const vehicleTypeIdRaw = searchParams.get("vehicleTypeId");

    const vehicleTypeId = vehicleTypeIdRaw
      ? parsePositiveInt(vehicleTypeIdRaw, "vehicleTypeId")
      : undefined;

    const data = await searchAdminOfflineTrips({
      originCityId,
      destinationCityId,
      date,
      timeFrom,
      timeTo,
      vehicleTypeId,
    });

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN OFFLINE TRIP SEARCH ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể tìm kiếm chuyến xe";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    return errorResponse(message, null, 400);
  }
}
