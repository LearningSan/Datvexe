import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { getAdminTicketWarningsService } from "@/services/server/admin/admin-ticket.service";

export async function GET() {
  try {
    return successResponse(await getAdminTicketWarningsService());
  } catch (error: any) {
    return errorResponse(error.message || "Không thể tải cảnh báo vé", null, 500);
  }
}
