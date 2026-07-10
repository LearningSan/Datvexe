import { NextRequest } from "next/server";

import {
  getAdminUsers,
  createAdminUser,
} from "@/services/server/admin/admin-user.service";

import {
  adminUserListQuerySchema,
  createAdminUserSchema,
} from "@/validators/admin/user.validator";

import { successResponse, errorResponse } from "@/lib/server/response";

function getZodMessage(error: any, fallback: string) {
  return error?.issues?.[0]?.message || error?.errors?.[0]?.message || fallback;
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

export async function GET(req: NextRequest) {
  try {
    const searchParams = Object.fromEntries(req.nextUrl.searchParams);
    const parsed = adminUserListQuerySchema.parse(searchParams);

    const data = await getAdminUsers(parsed);

    return successResponse(data);
  } catch (error: any) {
    console.error("[ADMIN USERS LIST ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(
        getZodMessage(error, "Dữ liệu lọc người dùng không hợp lệ"),
        null,
        400,
      );
    }

    return errorResponse(
      error.message || "Không thể lấy danh sách người dùng",
      null,
      500,
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createAdminUserSchema.parse(body);

    const data = await createAdminUser(parsed);

    return successResponse(data, "Tạo tài khoản thành công");
  } catch (error: any) {
    console.error("[CREATE ADMIN USER ERROR]", error);

    if (error.name === "ZodError") {
      return errorResponse(
        getZodMessage(error, "Dữ liệu tạo tài khoản không hợp lệ"),
        null,
        400,
      );
    }

    if (error.code === "ER_DUP_ENTRY") {
      return errorResponse(getMysqlDuplicateMessage(error), null, 400);
    }

    return errorResponse(error.message || "Không thể tạo tài khoản", null, 500);
  }
}
