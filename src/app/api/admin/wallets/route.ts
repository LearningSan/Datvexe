import { NextRequest } from "next/server";

import { successResponse, errorResponse } from "@/lib/server/response";

import { adminWalletListQuerySchema } from "@/validators/admin/wallet.validator";

import { getAdminWallets } from "@/services/server/admin/admin-wallet.service";

export async function GET(request: NextRequest) {
  try {
    const params = adminWalletListQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    const data = await getAdminWallets(params);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN WALLET LIST ERROR]", error);

    return errorResponse(
      error instanceof Error ? error.message : "Không thể lấy danh sách ví",
      null,
      500,
    );
  }
}
