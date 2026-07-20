import { NextRequest, NextResponse } from "next/server";

import { processCheckinReminders } from "@/services/server/admin/checkin/checkin-reminder.service";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    verifyCronRequest(request);

    const limitParam = request.nextUrl.searchParams.get("limit");

    const limit = limitParam == null ? undefined : Number(limitParam);

    const result = await processCheckinReminders({
      limit,
    });

    return NextResponse.json(result, {
      status: 200,
    });
  } catch (error: unknown) {
    console.error("[CHECKIN REMINDER CRON ERROR]", error);

    if (error instanceof Error && error.message === "CRON_UNAUTHORIZED") {
      return NextResponse.json(
        {
          message: "Cron không được phép truy cập",
        },
        {
          status: 401,
        },
      );
    }

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Không thể xử lý reminder check-in",
      },
      {
        status: 500,
      },
    );
  }
}

function verifyCronRequest(request: NextRequest): void {
  const cronSecret = process.env.CRON_SECRET?.trim();

  if (!cronSecret) {
    throw new Error("CRON_SECRET chưa được cấu hình");
  }

  const authorization = request.headers.get("authorization");

  if (authorization !== `Bearer ${cronSecret}`) {
    throw new Error("CRON_UNAUTHORIZED");
  }
}
