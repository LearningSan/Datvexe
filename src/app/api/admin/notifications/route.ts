import { NextRequest } from "next/server";

import { ZodError } from "zod";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";

import { successResponse, errorResponse } from "@/lib/server/response";

import {
  getAdminNotifications,
  createAdminNotification,
} from "@/services/server/admin/admin-notification.service";

import {
  adminNotificationListQuerySchema,
  createAdminNotificationSchema,
} from "@/validators/admin/notification.validator";

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const searchParams = Object.fromEntries(req.nextUrl.searchParams);

    const parsed = adminNotificationListQuerySchema.parse(searchParams);

    const data = await getAdminNotifications(parsed);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN NOTIFICATIONS LIST ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể lấy danh sách thông báo";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof ZodError) {
      return errorResponse(
        error.issues[0]?.message || "Dữ liệu lọc thông báo không hợp lệ",
        null,
        400,
      );
    }

    return errorResponse(message, null, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const body = await req.json();

    const parsed = createAdminNotificationSchema.parse(body);

    const data = await createAdminNotification(parsed);

    return successResponse(data, "Tạo thông báo thành công", 201);
  } catch (error: unknown) {
    console.error("[CREATE ADMIN NOTIFICATION ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể tạo thông báo";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Dữ liệu JSON không hợp lệ", null, 400);
    }

    if (error instanceof ZodError) {
      return errorResponse(
        error.issues[0]?.message || "Dữ liệu tạo thông báo không hợp lệ",
        null,
        400,
      );
    }

    if (message.includes("a foreign key constraint")) {
      return errorResponse("Người nhận không tồn tại", null, 400);
    }

    return errorResponse(message, null, 500);
  }
}
