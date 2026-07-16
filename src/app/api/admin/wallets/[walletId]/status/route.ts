import { NextRequest } from "next/server";

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
    const params = adminWalletIdParamsSchema.parse(await context.params);

    const payload = updateAdminWalletStatusSchema.parse(await request.json());

    const data = await updateAdminWalletStatus(params.walletId, payload);

    return successResponse(
      data,
      payload.status === "LOCKED" ? "Đã khóa ví" : "Đã mở khóa ví",
    );
  } catch (error: unknown) {
    console.error("[UPDATE ADMIN WALLET STATUS ERROR]", error);

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Không thể cập nhật trạng thái ví",
      null,
      400,
    );
  }
}
