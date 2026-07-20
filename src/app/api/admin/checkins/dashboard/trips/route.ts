import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ZodError } from "zod";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";

import { getCheckinDashboardTrips } from "@/services/server/admin/checkin/admin-checkin-dashboard-trip.service";

import { checkinDashboardTripsQuerySchema } from "@/validators/admin/checkin/admin-checkin-dashboard.validator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await getAdminAuthUserId(request);

    const searchParams = request.nextUrl.searchParams;

    const payload = checkinDashboardTripsQuerySchema.parse({
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,

      phase: searchParams.get("phase") ?? undefined,
      keyword: searchParams.get("keyword") ?? undefined,

      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,

      sort: searchParams.get("sort") ?? undefined,
    });

    const result = await getCheckinDashboardTrips(payload);

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[GET CHECKIN DASHBOARD TRIPS ERROR]", error);

    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          message: error.issues[0]?.message ?? "Tham số truy vấn không hợp lệ",
        },
        {
          status: 400,
        },
      );
    }

    const message =
      error instanceof Error
        ? error.message
        : "Không thể tải danh sách chuyến check-in";

    if (message === "UNAUTHORIZED") {
      return NextResponse.json(
        {
          message: "UNAUTHORIZED",
        },
        {
          status: 401,
        },
      );
    }

    if (
      message === "Khoảng thời gian không hợp lệ" ||
      message === "Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc"
    ) {
      return NextResponse.json(
        {
          message,
        },
        {
          status: 400,
        },
      );
    }

    return NextResponse.json(
      {
        message,
      },
      {
        status: 500,
      },
    );
  }
}
