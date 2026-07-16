import { NextRequest } from "next/server";

import { successResponse, errorResponse } from "@/lib/server/response";

import { confirmCashPaymentSchema } from "@/validators/admin/cash-payment.validator";

import { confirmAdminCashPayment } from "@/services/server/admin/admin-cash-payment.service";

export async function POST(request: NextRequest) {
  try {
    const payload = confirmCashPaymentSchema.parse(await request.json());

    /*
     * Sau này có admin auth helper thì lấy
     * cashierUserId từ JWT, không nhận từ client.
     */
    const result = await confirmAdminCashPayment({
      transactionCode: payload.transactionCode,

      note: payload.note,
      cashierUserId: null,
    });

    return successResponse(
      result,
      result.alreadyProcessed
        ? "Giao dịch đã được xác nhận trước đó"
        : "Xác nhận thu tiền thành công",
    );
  } catch (error: unknown) {
    console.error("[ADMIN CASH CONFIRM ERROR]", error);

    return errorResponse(
      error instanceof Error ? error.message : "Không thể xác nhận thu tiền",
      null,
      400,
    );
  }
}
    