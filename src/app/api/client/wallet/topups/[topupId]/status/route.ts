import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/server/response";

import { getAuthUserId } from "@/lib/server/auth-user";

import { getWalletTopupStatus } from "@/services/server/client/wallet-topup.service";

export async function GET(
  request: NextRequest,
  context: {
    params: Promise<{
      topupId: string;
    }>;
  },
) {
  try {
    const userId = await getAuthUserId(request);

    if (!userId) {
      return errorResponse("Bạn cần đăng nhập", null, 401);
    }

    const { topupId } = await context.params;

    const result = await getWalletTopupStatus(Number(userId), Number(topupId));

    return successResponse(result);
  } catch (error: unknown) {
    console.error("[GET WALLET TOPUP STATUS ERROR]", error);

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Không lấy được trạng thái nạp ví",
      null,
      400,
    );
  }
}
