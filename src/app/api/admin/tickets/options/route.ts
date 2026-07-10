import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { getAdminTicketOptions } from "@/services/server/admin/admin-ticket.service";

export async function GET() {
  try {
    return successResponse(await getAdminTicketOptions());
  } catch (error: any) {
    return errorResponse(error.message || "Không thể tải options vé", null, 500);
  }
}
