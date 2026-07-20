import type mysql from "mysql2/promise";

import { withTransaction } from "@/lib/server/mysql";

import {
  findPaymentByTransactionCode,
  updatePaymentByWebhook,
  updateBookingStatus,
  findSeatHoldsByBooking,
  insertBookingSeatsWebhook,
  deleteSeatHoldsByBooking,
  findBookingByIdForNotification,
} from "@/repositories/client/payment-webhook.repo";

import { createNotification } from "@/repositories/client/notification.repo";
import { sendPaymentSuccessEmail } from "@/lib/server/mail";

import type { PaymentWebhookPayload } from "@/types/client/payment/payment.type";

export async function confirmPaymentByTransactionCode(params: {
  conn: mysql.PoolConnection;
  transactionCode: string;
  status: "SUCCESS" | "FAILED";
  amount?: number;
  gatewayTransactionId: string;
  gatewayResponse: unknown;
}) {
  const existing = await findPaymentByTransactionCode(
    params.conn,
    params.transactionCode,
  );

  if (!existing) {
    throw new Error("Transaction không tồn tại");
  }

  /*
   * Webhook có thể được gửi lại nhiều lần.
   */
  if (existing.status === "PAID" || existing.status === "FAILED") {
    return {
      success: true,
      bookingId: existing.bookingId,
      alreadyProcessed: true,
    };
  }

  if (
    typeof params.amount === "number" &&
    Math.round(Number(existing.amount)) !== Math.round(Number(params.amount))
  ) {
    throw new Error("Số tiền thanh toán không khớp");
  }

  const isPaid = params.status === "SUCCESS";

  await updatePaymentByWebhook(params.conn, existing.paymentId, {
    status: isPaid ? "PAID" : "FAILED",
    paidAt: isPaid ? new Date() : null,
    gatewayTransactionId: params.gatewayTransactionId,
    gatewayResponse:
      typeof params.gatewayResponse === "string"
        ? params.gatewayResponse
        : JSON.stringify(params.gatewayResponse ?? {}),
  });

  if (!isPaid) {
    await updateBookingStatus(params.conn, existing.bookingId, "CANCELLED");

    return {
      success: true,
      bookingId: existing.bookingId,
      alreadyProcessed: false,
    };
  }

  await updateBookingStatus(params.conn, existing.bookingId, "CONFIRMED");

  const holds = await findSeatHoldsByBooking(params.conn, existing.bookingId);

  if (!holds.length) {
    throw new Error("Không tìm thấy ghế đang giữ");
  }

  await insertBookingSeatsWebhook(
    params.conn,
    existing.bookingId,
    holds[0].tripId,
    holds.map((seat) => ({
      seatLayoutDetailId: seat.seatLayoutDetailId,
      seatPrice: Number(seat.seatPrice),
    })),
  );

  await deleteSeatHoldsByBooking(params.conn, existing.bookingId);

  return {
    success: true,
    bookingId: existing.bookingId,
    alreadyProcessed: false,
  };
}

export async function sendPaymentResultSideEffects(params: {
  bookingId: number;
  isPaid: boolean;
}) {
  const bookingInfo = await findBookingByIdForNotification(params.bookingId);

  console.log("[PAYMENT BOOKING INFO]", {
    bookingId: params.bookingId,
    found: Boolean(bookingInfo),
    isPaid: params.isPaid,
    contactEmail: bookingInfo?.contactEmail ?? null,
  });

  if (!bookingInfo) {
    throw new Error("Không tìm thấy thông tin booking để gửi email");
  }

  if (bookingInfo?.userId) {
    await withTransaction(async (conn) => {
      await createNotification(conn, {
        userId: bookingInfo.userId,
        type: params.isPaid ? "PAYMENT" : "BOOKING",
        title: params.isPaid ? "Thanh toán thành công" : "Thanh toán thất bại",
        content: params.isPaid
          ? `Thanh toán thành công! Mã vé của bạn là ${bookingInfo.bookingCode}.`
          : `Giao dịch thất bại. Vé ${bookingInfo.bookingCode} đã bị hủy.`,
      });
    });
  }
  if (!params.isPaid) {
    return;
  }

  if (!bookingInfo.contactEmail?.trim()) {
    throw new Error(
      `Booking ${bookingInfo.bookingCode} không có email người nhận`,
    );
  }

  console.log("[PAYMENT EMAIL START]", {
    bookingId: params.bookingId,
    bookingCode: bookingInfo.bookingCode,
    to: bookingInfo.contactEmail,
  });

  await sendPaymentSuccessEmail({
    bookingId: params.bookingId,
    to: bookingInfo.contactEmail,
    customerName: bookingInfo.contactName,
    customerPhone: bookingInfo.contactPhone,
    bookingCode: bookingInfo.bookingCode,
    amount: bookingInfo.totalAmount,
    routeName: bookingInfo.routeName,
    departureDatetime: bookingInfo.departureDatetime,
    arrivalDatetime: bookingInfo.arrivalDatetime,
    pickupPointName: bookingInfo.pickupPointName,
    pickupPointAddress: bookingInfo.pickupPointAddress,
    dropoffPointName: bookingInfo.dropoffPointName,
    dropoffPointAddress: bookingInfo.dropoffPointAddress,
    vehicleName: bookingInfo.vehicleName,
    licensePlate: bookingInfo.licensePlate,
    seatNumbers: bookingInfo.seatNumbers,
  });

  console.log("[PAYMENT EMAIL SUCCESS]", {
    bookingId: params.bookingId,
    to: bookingInfo.contactEmail,
  });
}

export async function handlePaymentWebhook(payload: PaymentWebhookPayload) {
  const result = await withTransaction(async (conn) => {
    return confirmPaymentByTransactionCode({
      conn,
      transactionCode: payload.transactionCode,
      status: payload.status,
      amount: payload.amount,
      gatewayTransactionId:
        payload.gatewayTransactionId ?? payload.transactionCode,
      gatewayResponse: payload.gatewayResponse ?? payload,
    });
  });

  if (!result.alreadyProcessed) {
    try {
      await sendPaymentResultSideEffects({
        bookingId: result.bookingId,
        isPaid: payload.status === "SUCCESS",
      });
    } catch (error) {
      console.error("[PAYMENT WEBHOOK SIDE EFFECT ERROR]", error);
    }
  }

  return result;
}
