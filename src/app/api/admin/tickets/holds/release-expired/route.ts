import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { releaseExpiredTicketHolds } from "@/services/server/admin/admin-ticket.service";

export async function POST() {
  try {
    return successResponse(await releaseExpiredTicketHolds(), "Đã giải phóng giữ chỗ hết hạn");
  } catch (error: any) {
    return errorResponse(error.message || "Không thể giải phóng giữ chỗ hết hạn", null, 500);
  }
}
