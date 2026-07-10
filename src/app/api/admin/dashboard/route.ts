import { NextRequest } from "next/server";
import { getDashboardData } from "@/services/server/client/dashboard.service";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const fromDate = searchParams.get("fromDate");
    const toDate = searchParams.get("toDate");

    if (!fromDate || !toDate) {
      return errorResponse("Thiếu fromDate hoặc toDate", null, 400);
    }

    const data = await getDashboardData({
      fromDate,
      toDate,
    });

    return successResponse(data);
  } catch (error: any) {
    console.error("[ADMIN DASHBOARD ERROR]", error);

    return errorResponse(
      error.message || "Không thể tải dữ liệu dashboard",
      null,
      500,
    );
  }
}
