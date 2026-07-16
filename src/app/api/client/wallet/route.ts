import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/server/response";

import { getAuthUserId } from "@/lib/server/auth-user";

import { getMyWallet } from "@/services/server/client/wallet.service";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);

    if (!userId) {
      return errorResponse("Bạn cần đăng nhập để xem ví", null, 401);
    }

    const wallet = await getMyWallet(Number(userId));

    return successResponse(wallet, "Lấy thông tin ví thành công");
  } catch (error: unknown) {
    console.error("[GET MY WALLET ERROR]", error);

    return errorResponse(
      error instanceof Error ? error.message : "Không thể lấy thông tin ví",
      null,
      500,
    );
  }
}
