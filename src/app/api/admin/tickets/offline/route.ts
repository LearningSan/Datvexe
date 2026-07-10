import { NextRequest } from "next/server";
import { successResponse, errorResponse } from "@/lib/server/response";

import { createAdminOfflineTicket } from "@/services/server/admin/admin-ticket.service";
import { createOfflineTicketSchema } from "@/validators/admin/ticket.validator";

export async function POST(req: NextRequest) {
  try {
    const parsed = createOfflineTicketSchema.parse(await req.json());
    return successResponse(await createAdminOfflineTicket(parsed), "Tạo vé offline thành công");
  } catch (error: any) {
    if (error.name === "ZodError") return errorResponse(error.errors?.[0]?.message, null, 400);
    return errorResponse(error.message || "Không thể tạo vé offline", null, 500);
  }
}
