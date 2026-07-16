import {
  findAdminCashPayments,
  findCashPaymentByTransactionCode,
  findCashPaymentForUpdate,
} from "@/repositories/admin/cash-payment.repo";

import {
  confirmPaymentByTransactionCode,
  sendPaymentResultSideEffects,
} from "@/services/server/client/payment-webhook.service";

import { withTransaction } from "@/lib/server/mysql";

import type {
  AdminCashPaymentListParams,
  ConfirmCashPaymentPayload,
} from "@/types/admin/payments/cash-payment.type";

export async function getAdminCashPayments(params: AdminCashPaymentListParams) {
  return findAdminCashPayments(params);
}

export async function lookupAdminCashPayment(transactionCode: string) {
  const payment = await findCashPaymentByTransactionCode(transactionCode);

  if (!payment) {
    throw new Error("Không tìm thấy giao dịch tiền mặt");
  }

  return payment;
}

export async function confirmAdminCashPayment(
  payload: ConfirmCashPaymentPayload & {
    cashierUserId?: number | null;
  },
) {
  const result = await withTransaction(async (conn) => {
    const payment = await findCashPaymentForUpdate(
      conn,
      payload.transactionCode,
    );

    if (!payment) {
      throw new Error("Không tìm thấy giao dịch tiền mặt");
    }

    if (payment.status === "PAID") {
      return {
        success: true as const,
        bookingId: Number(payment.bookingId),
        paymentId: Number(payment.paymentId),
        alreadyProcessed: true,
      };
    }

    if (payment.status !== "PENDING" && payment.status !== "WAITING_CONFIRM") {
      throw new Error("Giao dịch không còn ở trạng thái chờ thanh toán");
    }

    const confirmResult = await confirmPaymentByTransactionCode({
      conn,

      transactionCode: payment.transactionCode,

      status: "SUCCESS",

      amount: Number(payment.amount),

      gatewayTransactionId: `CASH-COUNTER-${Date.now()}`,

      gatewayResponse: {
        provider: "CASH",
        source: "ADMIN_COUNTER",

        cashierUserId: payload.cashierUserId ?? null,

        note: payload.note ?? null,

        confirmedAt: new Date().toISOString(),
      },
    });

    return {
      ...confirmResult,
      paymentId: Number(payment.paymentId),
    };
  });

  if (!result.alreadyProcessed) {
    try {
      await sendPaymentResultSideEffects({
        bookingId: result.bookingId,
        isPaid: true,
      });
    } catch (error) {
      console.error("[CASH PAYMENT SIDE EFFECT ERROR]", error);
    }
  }

  return result;
}
