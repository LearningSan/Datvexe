import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import {
  adminWalletIdParamsSchema,
  updateAdminWalletStatusSchema,
} from "@/validators/admin/wallet.validator";

import { updateAdminWalletStatus } from "@/services/server/admin/admin-wallet.service";

interface Context {
  params: Promise<{
    walletId: string;
  }>;
}

export async function PATCH(request: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(request);

    const params = adminWalletIdParamsSchema.parse(await context.params);

    const payload = updateAdminWalletStatusSchema.parse(await request.json());

    const data = await updateAdminWalletStatus(
      params.walletId,
      payload,
    );

    return successResponse(
      data,
      payload.status === "LOCKED" ? "Đã khóa ví" : "Đã mở khóa ví",
    );
  } catch (error: unknown) {
    console.error("[UPDATE ADMIN WALLET STATUS ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể cập nhật trạng thái ví";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof SyntaxError) {
      return errorResponse("Dữ liệu JSON không hợp lệ", null, 400);
    }

    if (error instanceof ZodError) {
      return errorResponse(
        error.issues[0]?.message || "Dữ liệu không hợp lệ",
        null,
        400,
      );
    }

    return errorResponse(message, null, 500);
  }
}
