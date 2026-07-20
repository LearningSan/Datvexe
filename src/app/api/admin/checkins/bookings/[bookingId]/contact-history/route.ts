import { NextRequest, NextResponse } from "next/server";

import { ZodError } from "zod";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";

import {
  contactHistoryParamsSchema,
  contactHistoryQuerySchema,
} from "@/validators/admin/checkin/checkin-contact.validator";

import { getPassengerContactHistory } from "@/services/server/admin/checkin/admin-checkin-contact.service";

interface RouteContext {
  params: Promise<{
    bookingId: string;
  }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    await getAdminAuthUserId(request);

    const params = await context.params;

    const parsedParams = contactHistoryParamsSchema.parse(params);

    const parsedQuery = contactHistoryQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    const result = await getPassengerContactHistory({
      bookingId: parsedParams.bookingId,
      tripId: parsedQuery.tripId,
    });

    return NextResponse.json(result, {
      status: 200,
    });
  } catch (error: unknown) {
    console.error("[GET PASSENGER CONTACT HISTORY ERROR]", error);

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
            : "Không thể lấy lịch sử liên hệ",
      },
      {
        status: 500,
      },
    );
  }
}
