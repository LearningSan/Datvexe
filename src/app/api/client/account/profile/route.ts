import { NextRequest } from "next/server";

import { getAuthUserId } from "@/lib/server/auth-user";
import {
  getAccountProfile,
  updateAccountProfile,
} from "@/services/server/client/user.service";
import { successResponse, errorResponse } from "@/lib/server/response";

export async function GET(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    const profile = await getAccountProfile(userId);

    return successResponse(profile);
  } catch (error: any) {
    console.error(error);

    if (error.message === "UNAUTHORIZED") {
      return errorResponse("Bạn chưa đăng nhập", 401);
    }

    return errorResponse("Không thể lấy thông tin tài khoản", 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const userId = await getAuthUserId(req);
    const body = await req.json();

    const profile = await updateAccountProfile(userId, body);

    return successResponse(profile);
  } catch (error: any) {
    console.error(error);

    if (error.message === "UNAUTHORIZED") {
      return errorResponse("Bạn chưa đăng nhập", 401);
    }

    return errorResponse("Không thể cập nhật tài khoản", 500);
  }
}
