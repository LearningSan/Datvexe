import { NextRequest } from "next/server";

import { copyAdminTrips } from "@/services/server/admin/admin-trip.service";
import { copyTripsSchema } from "@/validators/admin/trip.validator";

import { successResponse, errorResponse } from "@/lib/server/response";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = copyTripsSchema.parse(body);

    const data = await copyAdminTrips(parsed);

    return successResponse(data, "Sao chép lịch chuyến thành công");
  } catch (error: any) {
    console.error("[COPY ADMIN TRIPS ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(error.errors?.[0]?.message, null, 400);
    }

    return errorResponse(
      error.message || "Không thể sao chép lịch chuyến",
      null,
      500,
    );
  }
}
