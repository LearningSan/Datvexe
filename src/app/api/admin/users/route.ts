import { NextRequest } from "next/server";

import { ZodError } from "zod";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import {
  createAdminUser,
  getAdminUsers,
} from "@/services/server/admin/admin-user.service";

import {
  adminUserListQuerySchema,
  createAdminUserSchema,
} from "@/validators/admin/user.validator";

interface MysqlError {
  code?: string;
  sqlMessage?: string;
  message?: string;
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

export async function GET(req: NextRequest) {
  try {
    await getAdminAuthUserId(req);

    const searchParams = Object.fromEntries(req.nextUrl.searchParams);

    const parsed = adminUserListQuerySchema.parse(searchParams);
    const data = await getAdminUsers(parsed);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN USERS LIST ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể lấy danh sách người dùng";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof ZodError) {
      return errorResponse(
        error.issues[0]?.message || "Dữ liệu lọc người dùng không hợp lệ",
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
    const parsed = createAdminUserSchema.parse(body);

    const data = await createAdminUser(parsed);

    return successResponse(data, "Tạo tài khoản thành công");
  } catch (error: unknown) {
    console.error("[CREATE ADMIN USER ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể tạo tài khoản";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Dữ liệu JSON không hợp lệ", null, 400);
    }

    if (error instanceof ZodError) {
      return errorResponse(
        error.issues[0]?.message || "Dữ liệu tạo tài khoản không hợp lệ",
        null,
        400,
      );
    }

    if (isMysqlError(error) && error.code === "ER_DUP_ENTRY") {
      return errorResponse(getMysqlDuplicateMessage(error), null, 409);
    }

    return errorResponse(message, null, 500);
  }
}
