import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { confirmCashPaymentSchema } from "@/validators/admin/cash-payment.validator";

import { confirmAdminCashPayment } from "@/services/server/admin/checkin/admin-cash-payment.service";

export async function POST(request: NextRequest) {
  try {
    const cashierUserId = await getAdminAuthUserId(request);

    const payload = confirmCashPaymentSchema.parse(await request.json());

    const result = await confirmAdminCashPayment({
      transactionCode: payload.transactionCode,
      note: payload.note,
      cashierUserId,
    });

    return successResponse(
      result,
      result.alreadyProcessed
        ? "Giao dịch đã được xác nhận trước đó"
        : "Xác nhận thu tiền thành công",
    );
  } catch (error: unknown) {
    console.error("[ADMIN CASH CONFIRM ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể xác nhận thu tiền";

    return errorResponse(
      message === "UNAUTHORIZED"
        ? "Phiên đăng nhập quản trị không hợp lệ"
        : message,
      null,
      message === "UNAUTHORIZED" ? 401 : 400,
    );
  }
}
