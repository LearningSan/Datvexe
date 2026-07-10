import { NextRequest } from "next/server";

import {
  createAdminTrip,
  getAdminTrips,
} from "@/services/server/admin/admin-trip.service";

import {
  adminTripListQuerySchema,
  createAdminTripSchema,
} from "@/validators/admin/trip.validator";

import { successResponse, errorResponse } from "@/lib/server/response";

export async function GET(req: NextRequest) {
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = adminTripListQuerySchema.parse(searchParams);

    const data = await getAdminTrips(parsed);

    return successResponse(data);
  } catch (error: any) {
    console.error("[ADMIN TRIPS LIST ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(
        error.errors?.[0]?.message || "Dữ liệu lọc chuyến xe không hợp lệ",
        null,
        400,
      );
    }

    return errorResponse(
      error.message || "Không thể lấy danh sách chuyến xe",
      null,
      500,
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createAdminTripSchema.parse(body);

    const data = await createAdminTrip(parsed);

    return successResponse(data, "Tạo chuyến xe thành công");
  } catch (error: any) {
    console.error("[CREATE ADMIN TRIP ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(error.message || "Không thể tạo chuyến xe", null, 500);
  }
}
