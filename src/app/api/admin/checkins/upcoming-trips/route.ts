import { NextRequest, NextResponse } from "next/server";

import { ZodError } from "zod";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";

import { upcomingCheckinTripsQuerySchema } from "@/validators/admin/checkin-query.validator";

import { getUpcomingCheckinTrips } from "@/services/server/admin/checkin/admin-checkin-query.service";

export async function GET(request: NextRequest) {
  try {
    await getAdminAuthUserId(request);

    const searchParams = Object.fromEntries(request.nextUrl.searchParams);

    const input = upcomingCheckinTripsQuerySchema.parse(searchParams);

    const result = await getUpcomingCheckinTrips(input);

    return NextResponse.json(result, {
      status: 200,
    });
  } catch (error: unknown) {
    console.error("[GET UPCOMING CHECKIN TRIPS ERROR]", error);

    if (error instanceof Error && error.message === "UNAUTHORIZED") {
      return NextResponse.json(
        {
          message: "Phiên đăng nhập quản trị không hợp lệ",
        },
        {
          status: 401,
        },
      );
    }

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: "Tham số truy vấn không hợp lệ",
          errors: error.flatten(),
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Không thể lấy danh sách chuyến check-in",
      },
      {
        status: 500,
      },
    );
  }
}
