import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { getAdminTickets, createAdminOfflineTicket } from "@/services/server/admin/admin-ticket.service";
import { adminTicketListQuerySchema, createOfflineTicketSchema } from "@/validators/admin/ticket.validator";

export async function GET(req: NextRequest) {
  try {
    const parsed = adminTicketListQuerySchema.parse(Object.fromEntries(req.nextUrl.searchParams));
    const data = await getAdminTickets(parsed);
    return successResponse(data);
  } catch (error: any) {
    console.error("[ADMIN TICKETS LIST ERROR]", error);
    if (error.name === "ZodError") return errorResponse(error.errors?.[0]?.message, null, 400);
    return errorResponse(error.message || "Không thể tải danh sách vé", null, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const parsed = createOfflineTicketSchema.parse(await req.json());
    const data = await createAdminOfflineTicket(parsed);
    return successResponse(data, "Tạo vé offline thành công");
  } catch (error: any) {
    console.error("[CREATE OFFLINE TICKET ERROR]", error);
    if (error.name === "ZodError") return errorResponse(error.errors?.[0]?.message, null, 400);
    return errorResponse(error.message || "Không thể tạo vé offline", null, 500);
  }
}
