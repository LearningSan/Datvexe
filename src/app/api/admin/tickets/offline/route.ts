import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { createAdminOfflineTicket } from "@/services/server/admin/admin-ticket.service";

import { createOfflineTicketSchema } from "@/validators/admin/ticket.validator";

export async function POST(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const body = await req.json();
    const parsed = createOfflineTicketSchema.parse(body);

    const data = await createAdminOfflineTicket(parsed);

    return successResponse(data, "Tạo vé offline thành công");
  } catch (error: unknown) {
    console.error("[ADMIN CREATE OFFLINE TICKET ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể tạo vé offline";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Dữ liệu JSON không hợp lệ", null, 400);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(message, null, 400);
    }

    return errorResponse(message, null, 500);
  }
}
