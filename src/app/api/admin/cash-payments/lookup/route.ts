import { NextRequest } from "next/server";

import { getAdminAuthUserId } from "@/lib/server/admin-auth-user";
import { successResponse, errorResponse } from "@/lib/server/response";

import { lookupCashPaymentSchema } from "@/validators/admin/cash-payment.validator";

import { lookupAdminCashPayment } from "@/services/server/admin/checkin/admin-cash-payment.service";

export async function POST(request: NextRequest) {
  try {
    await getAdminAuthUserId(request);

    const payload = lookupCashPaymentSchema.parse(await request.json());

    const data = await lookupAdminCashPayment(payload.transactionCode);

    return successResponse(data);
  } catch (error: unknown) {
    console.error("[ADMIN CASH LOOKUP ERROR]", error);

    const message =
      error instanceof Error ? error.message : "Không thể tra cứu giao dịch";

    if (message === "UNAUTHORIZED") {
      return errorResponse("Phiên đăng nhập quản trị không hợp lệ", null, 401);
    }

    return errorResponse(
      message,
      null,
      message.includes("Không tìm thấy") ? 404 : 400,
    );
  }
}
