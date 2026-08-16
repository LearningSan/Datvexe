import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";

import { successResponse, errorResponse } from "@/lib/server/response";

import { getAvailableTripResources } from "@/services/server/admin/admin-trip.service";

import { availableTripResourcesSchema } from "@/validators/admin/trip.validator";

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const searchParams = Object.fromEntries(req.nextUrl.searchParams);

    const parsed = availableTripResourcesSchema.parse(searchParams);

    const data = await getAvailableTripResources(parsed);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN AVAILABLE TRIP RESOURCES ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể lấy xe và tài xế khả dụng";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(message, null, 400);
    }

    return errorResponse(message, null, 500);
  }
}
