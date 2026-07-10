import { NextRequest } from "next/server";

import {
  updateAdminUser,
  getAdminUserDetail
} from "@/services/server/admin/admin-user.service";

import { updateAdminUserSchema } from "@/validators/admin/user.validator";
import { successResponse, errorResponse } from "@/lib/server/response";

interface Context {
  params: Promise<{
    userId: string;
  }>;
}

function getZodMessage(error: any, fallback: string) {
  return error?.issues?.[0]?.message || error?.errors?.[0]?.message || fallback;
}

function parseUserId(value: string) {
  const userId = Number(value);

  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("userId không hợp lệ");
  }

  return userId;
}

function getMysqlDuplicateMessage(error: any) {
  const message = String(error?.sqlMessage || "");

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
    const params = await context.params;
    const userId = parseUserId(params.userId);

    const body = await req.json();
    const parsed = updateAdminUserSchema.parse(body);

    const data = await updateAdminUser(userId, parsed);

    return successResponse(data, "Cập nhật tài khoản thành công");
  } catch (error: any) {
    console.error("[UPDATE ADMIN USER ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(
        getZodMessage(error, "Dữ liệu cập nhật tài khoản không hợp lệ"),
        null,
        400,
      );
    }

    if (error.code === "ER_DUP_ENTRY") {
      return errorResponse(getMysqlDuplicateMessage(error), null, 400);
    }

    return errorResponse(
      error.message || "Không thể cập nhật tài khoản",
      null,
      error.message === "userId không hợp lệ" ? 400 : 500,
    );
  }
}

export async function GET(_req: NextRequest, context: Context) {
  try {
    const params = await context.params;
    const userId = parseUserId(params.userId);

    const data = await getAdminUserDetail(userId);

    return successResponse(data);
  } catch (error: any) {
    console.error("[GET ADMIN USER DETAIL ERROR]", error);

    return errorResponse(
      error.message || "Không thể lấy chi tiết khách hàng",
      null,
      error.message === "userId không hợp lệ" ? 400 : 500,
    );
  }
}
