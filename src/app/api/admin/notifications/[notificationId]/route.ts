import { NextRequest } from "next/server";

import { ZodError } from "zod";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";

import { successResponse, errorResponse } from "@/lib/server/response";

import {
  getAdminNotificationDetail,
  updateAdminNotification,
  updateAdminNotificationReadStatus,
  deleteAdminNotification,
} from "@/services/server/admin/admin-notification.service";

import { updateAdminNotificationSchema } from "@/validators/admin/notification.validator";

interface RouteContext {
  params: Promise<{
    notificationId: string;
  }>;
}

function parseNotificationId(value: string) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Mã thông báo không hợp lệ");
  }

  return id;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    await getAdminAuthUserId(req);

    const { notificationId } = await context.params;

    const id = parseNotificationId(notificationId);

    const data = await getAdminNotificationDetail(id);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN NOTIFICATION DETAIL ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể tải thông báo";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (message === "Không tìm thấy thông báo") {
      return errorResponse(message, null, 404);
    }

    if (message === "Mã thông báo không hợp lệ") {
      return errorResponse(message, null, 400);
    }

    return errorResponse(message, null, 500);
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    await getAdminAuthUserId(req);

    const { notificationId } = await context.params;

    const id = parseNotificationId(notificationId);

    const body = await req.json();

    /*
     * PATCH read status
     *
     * {
     *   "isRead": true
     * }
     */

    if (typeof body?.isRead === "boolean") {
      const data = await updateAdminNotificationReadStatus(id, body.isRead);

      return successResponse(
        data,
        body.isRead ? "Đã đánh dấu đã đọc" : "Đã đánh dấu chưa đọc",
      );
    }

    const parsed = updateAdminNotificationSchema.parse(body);

    const data = await updateAdminNotification(id, parsed);

    return successResponse(data, "Cập nhật thông báo thành công");
  } catch (error: unknown) {
    console.error("[UPDATE ADMIN NOTIFICATION ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể cập nhật thông báo";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (message === "Không tìm thấy thông báo") {
      return errorResponse(message, null, 404);
    }

    if (message === "Mã thông báo không hợp lệ") {
      return errorResponse(message, null, 400);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Dữ liệu JSON không hợp lệ", null, 400);
    }

    if (error instanceof ZodError) {
      return errorResponse(
        error.issues[0]?.message || "Dữ liệu cập nhật thông báo không hợp lệ",
        null,
        400,
      );
    }

    return errorResponse(message, null, 500);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    await getAdminAuthUserId(req);

    const { notificationId } = await context.params;

    const id = parseNotificationId(notificationId);

    const data = await deleteAdminNotification(id);

    return successResponse(data, "Xóa thông báo thành công");
  } catch (error: unknown) {
    console.error("[DELETE ADMIN NOTIFICATION ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể xóa thông báo";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (message === "Không tìm thấy thông báo") {
      return errorResponse(message, null, 404);
    }

    if (message === "Mã thông báo không hợp lệ") {
      return errorResponse(message, null, 400);
    }

    return errorResponse(message, null, 500);
  }
}
