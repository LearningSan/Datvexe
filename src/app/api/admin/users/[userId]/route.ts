import { NextRequest } from "next/server";

import { ZodError } from "zod";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import {
  getAdminUserDetail,
  updateAdminUser,
} from "@/services/server/admin/admin-user.service";

import { updateAdminUserSchema } from "@/validators/admin/user.validator";

interface Context {
  params: Promise<{
    userId: string;
  }>;
}

interface MysqlError {
  code?: string;
  sqlMessage?: string;
  message?: string;
}

function parseUserId(value: string): number {
  const userId = Number(value);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("userId không hợp lệ");
  }

  return userId;
}

function isMysqlError(error: unknown): error is MysqlError {
  return typeof error === "object" && error !== null;
}

function getMysqlDuplicateMessage(error: MysqlError): string {
  const message = String(error.sqlMessage || error.message || "").toLowerCase();

  if (message.includes("email")) {
    return "Email đã tồn tại trong hệ thống";
  }

  if (message.includes("phone")) {
    return "Số điện thoại đã tồn tại trong hệ thống";
  }

  return "Email hoặc số điện thoại đã tồn tại";
}

export async function PATCH(req: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(req);

    const { userId: rawUserId } = await context.params;
    const userId = parseUserId(rawUserId);

    const body = await req.json();
    const parsed = updateAdminUserSchema.parse(body);

    const data = await updateAdminUser(userId, parsed);

    return successResponse(data, "Cập nhật tài khoản thành công");
  } catch (error: unknown) {
    console.error("[UPDATE ADMIN USER ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể cập nhật tài khoản";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Dữ liệu JSON không hợp lệ", null, 400);
    }

    if (error instanceof ZodError) {
      return errorResponse(
        error.issues[0]?.message || "Dữ liệu cập nhật tài khoản không hợp lệ",
        null,
        400,
      );
    }

    if (isMysqlError(error) && error.code === "ER_DUP_ENTRY") {
      return errorResponse(getMysqlDuplicateMessage(error), null, 409);
    }

    if (message === "Không tìm thấy người dùng") {
      return errorResponse(message, null, 404);
    }

    return errorResponse(
      message,
      null,
      message === "userId không hợp lệ" ? 400 : 500,
    );
  }
}

export async function GET(req: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(req);

    const { userId: rawUserId } = await context.params;
    const userId = parseUserId(rawUserId);

    const data = await getAdminUserDetail(userId);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[GET ADMIN USER DETAIL ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể lấy chi tiết khách hàng";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (message === "Không tìm thấy người dùng") {
      return errorResponse(message, null, 404);
    }

    return errorResponse(
      message,
      null,
      message === "userId không hợp lệ" ? 400 : 500,
    );
  }
}
