import { NextRequest, NextResponse } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { getCheckinDashboardTrips } from "@/services/server/admin/checkin/admin-checkin-dashboard.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);
    const searchParams = req.nextUrl.searchParams;

    const from = searchParams.get("from") ?? undefined;

    const to = searchParams.get("to") ?? undefined;

    const rawLimit = searchParams.get("limit");

    const limit = rawLimit == null ? undefined : Number(rawLimit);

    const result = await getCheckinDashboardTrips({
      from,
      to,
      limit,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[GET CHECKIN DASHBOARD TRIPS ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể tải danh sách chuyến check-in";

    const status = message === "UNAUTHORIZED" ? 401 : 500;

    return NextResponse.json(
      {
        message:
          message === "UNAUTHORIZED"
            ? "Phiên đăng nhập quản trị không hợp lệ"
            : message,
      },
      { status },
    );
  }
}
