import { NextRequest } from "next/server";

import { getAuthUserId } from "@/lib/server/auth-user";
import { changeAccountPassword } from "@/services/server/client/user.service";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function PUT(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    const body = await req.json();

    const result = await changeAccountPassword(userId, body);

    return successResponse(result);
  } catch (error: any) {
    console.error(error);

    if (error.message === "UNAUTHORIZED") {
      return errorResponse("Bạn chưa đăng nhập", 401);
    }

    return errorResponse("Đổi mật khẩu thất bại", 500);
  }
}
