import { NextRequest } from "next/server";
import { ZodError } from "zod";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import {
  adjustAdminWalletSchema,
  adminWalletIdParamsSchema,
} from "@/validators/admin/wallet.validator";

import { adjustAdminWalletBalance } from "@/services/server/admin/admin-wallet.service";

interface Context {
  params: Promise<{
    walletId: string;
  }>;
}

export async function POST(request: NextRequest, context: Context) {
  try {
    await getAdminAuthUserId(request);

    const params = adminWalletIdParamsSchema.parse(await context.params);

    const payload = adjustAdminWalletSchema.parse(await request.json());

    const data = await adjustAdminWalletBalance(
      params.walletId,
      payload,
    
    );

    return successResponse(data, "Điều chỉnh số dư thành công");
  } catch (error: unknown) {
    console.error("[ADMIN WALLET ADJUSTMENT ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể điều chỉnh số dư";

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
