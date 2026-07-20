import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { ZodError } from "zod";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";

import { getCheckinDashboardPassengers } from "@/services/server/admin/checkin/admin-checkin-dashboard-passenger.service";

import {
  checkinDashboardPassengersQuerySchema,
  checkinDashboardTripIdSchema,
} from "@/validators/admin/checkin/admin-checkin-dashboard-passenger.validator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface RouteContext {
  params: Promise<{
    tripId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await getAdminAuthUserId(request);

    const { tripId: rawTripId } = await context.params;

    const tripId = checkinDashboardTripIdSchema.parse(rawTripId);

    const searchParams = request.nextUrl.searchParams;

    const payload = checkinDashboardPassengersQuerySchema.parse({
      checkinStatus: searchParams.get("checkinStatus") ?? undefined,

      contactStatus: searchParams.get("contactStatus") ?? undefined,

      alert: searchParams.get("alert") ?? undefined,

      keyword: searchParams.get("keyword") ?? undefined,

      page: searchParams.get("page") ?? undefined,

      limit: searchParams.get("limit") ?? undefined,

      sort: searchParams.get("sort") ?? undefined,
    });

    const result = await getCheckinDashboardPassengers({
      tripId,
      ...payload,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[GET CHECKIN DASHBOARD PASSENGERS ERROR]", error);

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
        : "Không thể tải danh sách hành khách";

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

    if (message === "TRIP_NOT_FOUND") {
      return NextResponse.json(
        {
          message: "Không tìm thấy chuyến xe",
        },
        {
          status: 404,
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
