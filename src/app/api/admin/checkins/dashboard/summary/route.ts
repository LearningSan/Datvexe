import { NextRequest, NextResponse } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";

import { getCheckinDashboardSummary } from "@/services/server/admin/checkin/admin-checkin-dashboard.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);
    const from = req.nextUrl.searchParams.get("from") ?? undefined;

    const to = req.nextUrl.searchParams.get("to") ?? undefined;

    const result = await getCheckinDashboardSummary({
      from,
      to,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[GET CHECKIN DASHBOARD SUMMARY ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể tải thống kê check-in";

    const status = message === "UNAUTHORIZED" ? 401 : 500;

    return NextResponse.json({ message }, { status });
  }
}
