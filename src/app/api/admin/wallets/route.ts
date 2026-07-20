import { NextRequest } from "next/server";

import { ZodError } from "zod";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { adminWalletListQuerySchema } from "@/validators/admin/wallet.validator";

import { getAdminWallets } from "@/services/server/admin/admin-wallet.service";

export async function GET(request: NextRequest) {
  try {
    await getAdminAuthUserId(request);

    const params = adminWalletListQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    const data = await getAdminWallets(params);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN WALLET LIST ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể lấy danh sách ví";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof ZodError) {
      return errorResponse(
        error.issues[0]?.message || "Dữ liệu lọc ví không hợp lệ",
        null,
        400,
      );
    }

    return errorResponse(message, null, 500);
  }
}
