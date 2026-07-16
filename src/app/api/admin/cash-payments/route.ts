import { NextRequest } from "next/server";

import { successResponse, errorResponse } from "@/lib/server/response";

import { adminCashPaymentListQuerySchema } from "@/validators/admin/cash-payment.validator";

import { getAdminCashPayments } from "@/services/server/admin/admin-cash-payment.service";

export async function GET(request: NextRequest) {
  try {
    const params = adminCashPaymentListQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams),
    );

    const data = await getAdminCashPayments(params);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN CASH PAYMENT LIST ERROR]", error);

    if (error instanceof Error && error.name === "ZodError") {
      return errorResponse("Dữ liệu lọc không hợp lệ", null, 400);
    }

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Không thể lấy danh sách thanh toán tại quầy",
      null,
      500,
    );
  }
}
