import { NextRequest, NextResponse } from "next/server";

import { processCheckinNoShows } from "@/services/server/admin/checkin/admin-checkin-no-show.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const expectedSecret = process.env.CRON_SECRET;

    if (!expectedSecret) {
      console.error("[CHECKIN NO SHOW CRON] Missing CRON_SECRET");

      return NextResponse.json(
        {
          message: "Server chưa cấu hình CRON_SECRET",
        },
        {
          status: 500,
        },
      );
    }

    const authorization = req.headers.get("authorization");

    if (authorization !== `Bearer ${expectedSecret}`) {
      return NextResponse.json(
        {
          message: "Không có quyền chạy cron",
        },
        {
          status: 401,
        },
      );
    }

    const searchParams = req.nextUrl.searchParams;

    const limit = parseOptionalInteger(searchParams.get("limit"));

    const graceMinutes = parseOptionalInteger(searchParams.get("graceMinutes"));

    const result = await processCheckinNoShows({
      limit,
      graceMinutes,
    });

    return NextResponse.json(result);
  } catch (error: unknown) {
    console.error("[CHECKIN NO SHOW CRON ERROR]", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Không thể xử lý hành khách vắng mặt",
      },
      {
        status: 500,
      },
    );
  }
}

function parseOptionalInteger(value: string | null): number | undefined {
  if (value == null || value.trim() === "") {
    return undefined;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed)) {
    return undefined;
  }

  return parsed;
}
