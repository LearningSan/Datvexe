import { NextRequest } from "next/server";

import { errorResponse, successResponse } from "@/lib/server/response";

import { getAuthUserId } from "@/lib/server/auth-user";

import { getMyWalletTransactions } from "@/services/server/client/wallet.service";

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthUserId(request);

    if (!userId) {
      return errorResponse("Bạn cần đăng nhập", null, 401);
    }

    const page = Number(request.nextUrl.searchParams.get("page") ?? 1);

    const limit = Number(request.nextUrl.searchParams.get("limit") ?? 10);

    const result = await getMyWalletTransactions(Number(userId), page, limit);

    return successResponse(result);
  } catch (error: unknown) {
    console.error("[GET WALLET TRANSACTIONS ERROR]", error);

    return errorResponse(
      error instanceof Error ? error.message : "Không lấy được lịch sử ví",
      null,
      500,
    );
  }
}
