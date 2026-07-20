import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import {
  createAdminOfflineTicket,
  getAdminTickets,
} from "@/services/server/admin/admin-ticket.service";

import {
  adminTicketListQuerySchema,
  createOfflineTicketSchema,
} from "@/validators/admin/ticket.validator";

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const query = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = adminTicketListQuerySchema.parse(query);

    const data = await getAdminTickets(parsed);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN TICKETS LIST ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể tải danh sách vé";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse(message, null, 400);
    }

    return errorResponse(message, null, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const body = await req.json();
    const parsed = createOfflineTicketSchema.parse(body);

    const data = await createAdminOfflineTicket(parsed);

    return successResponse(data, "Tạo vé offline thành công");
  } catch (error: unknown) {
    console.error("[CREATE OFFLINE TICKET ERROR]", error);

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
