import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { adminCashPaymentListQuerySchema } from "@/validators/admin/cash-payment.validator";

import { getAdminCashPayments } from "@/services/server/admin/checkin/admin-cash-payment.service";

export async function GET(request: NextRequest) {
  try {
    await getAdminAuthUserId(request);

    const params = adminCashPaymentListQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    const data = await getAdminCashPayments(params);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN CASH PAYMENT LIST ERROR]", error);

    const message =
      error instanceof Error
        ? error.message
        : "Không thể lấy danh sách thanh toán tại quầy";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse("Dữ liệu lọc không hợp lệ", null, 400);
    }

    return errorResponse(message, null, 500);
  }
}
