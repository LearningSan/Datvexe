import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";
import { searchAdminTicketForCheckin } from "@/services/server/admin/admin-ticket.service";

export async function GET(req: NextRequest) {
  try {
    const bookingCode = req.nextUrl.searchParams.get("bookingCode") || "";
    return successResponse(await searchAdminTicketForCheckin(bookingCode));
  } catch (error: any) {
    return errorResponse(error.message || "Không tìm thấy vé", null, 404);
  }
}
