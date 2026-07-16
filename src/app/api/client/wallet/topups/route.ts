import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/server/response";

import { getAuthUserId } from "@/lib/server/auth-user";

import { createWalletTopup } from "@/services/server/client/wallet-topup.service";

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);

    if (!userId) {
      return errorResponse("Bạn cần đăng nhập để nạp tiền", null, 401);
    }

    const body = await request.json();

    const result = await createWalletTopup(Number(userId), Number(body.amount));

    return successResponse(result, "Tạo giao dịch nạp ví thành công");
  } catch (error: unknown) {
    console.error("[CREATE WALLET TOPUP ERROR]", error);

    return errorResponse(
      error instanceof Error ? error.message : "Không thể tạo giao dịch nạp ví",
      null,
      400,
    );
  }
}
