import { NextRequest } from "next/server";

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
    const params = adminWalletIdParamsSchema.parse(await context.params);

    const payload = adjustAdminWalletSchema.parse(await request.json());

    const data = await adjustAdminWalletBalance(params.walletId, payload);

    return successResponse(data, "Điều chỉnh số dư thành công");
  } catch (error: unknown) {
    console.error("[ADMIN WALLET ADJUSTMENT ERROR]", error);

    return errorResponse(
      error instanceof Error ? error.message : "Không thể điều chỉnh số dư",
      null,
      400,
    );
  }
}
