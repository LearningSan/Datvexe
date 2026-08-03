import type mysql from "mysql2/promise";

import { withTransaction } from "@/lib/server/mysql";

import {
  findPaymentByTransactionCode,
  updatePaymentByWebhook,
  updateBookingStatus,
  findSeatHoldsByBooking,
  insertBookingSeatsWebhook,
  deleteSeatHoldsByBooking,
  findBookingsByIdsForNotification,
  findBookingIdsByPaymentId,
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

  const bookings = await findBookingIdsByPaymentId(
    params.conn,
    existing.paymentId,
  );

  if (!bookings.length) {
    throw new Error("Payment không có booking");
  }

  // Webhook có thể được gửi lại nhiều lần.
  if (existing.status === "PAID" || existing.status === "FAILED") {
    return {
      success: true,
      bookingIds: bookings.map((b) => b.bookingId),
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
    for (const booking of bookings) {
      await updateBookingStatus(params.conn, booking.bookingId, "CANCELLED");
    }

    return {
      success: true,
      bookingIds: bookings.map((b) => b.bookingId),
      alreadyProcessed: false,
    };
  }

  for (const booking of bookings) {
    await updateBookingStatus(params.conn, booking.bookingId, "CONFIRMED");

    const holds = await findSeatHoldsByBooking(params.conn, booking.bookingId);

    if (!holds.length) {
      throw new Error(
        `Không tìm thấy ghế đang giữ của booking ${booking.bookingId}`,
      );
    }

    await insertBookingSeatsWebhook(
      params.conn,
      booking.bookingId,
      holds[0].tripId,
      holds.map((seat) => ({
        seatLayoutDetailId: seat.seatLayoutDetailId,
        seatPrice: Number(seat.seatPrice),
      })),
    );

    await deleteSeatHoldsByBooking(params.conn, booking.bookingId);
  }

  return {
    success: true,
    bookingIds: bookings.map((b) => b.bookingId),
    alreadyProcessed: false,
  };
}

export async function sendPaymentResultSideEffects(params: {
  bookingIds: number[];
  isPaid: boolean;
}) {
  const bookings = await findBookingsByIdsForNotification(params.bookingIds);

  if (!bookings.length) {
    throw new Error("Không tìm thấy booking");
  }

  const bookingCodes = bookings.map((b) => b.bookingCode).join(", ");

  const userId = bookings[0].userId;

  if (userId) {
    await withTransaction(async (conn) => {
      await createNotification(conn, {
        userId,

        type: params.isPaid ? "PAYMENT" : "BOOKING",

        title: params.isPaid ? "Thanh toán thành công" : "Thanh toán thất bại",

        content: params.isPaid
          ? `Thanh toán thành công! Các mã vé của bạn: ${bookingCodes}.`
          : `Giao dịch thất bại. Các vé ${bookingCodes} đã bị hủy.`,
      });
    });
  }

  if (!params.isPaid) return;

  const firstBooking = bookings[0];

  if (!firstBooking.contactEmail?.trim()) {
    throw new Error("Booking không có email nhận");
  }

  await sendPaymentSuccessEmail({
    to: firstBooking.contactEmail,

    customerName: firstBooking.contactName,

    customerPhone: firstBooking.contactPhone,

    bookings: bookings.map((b) => ({
      bookingId: b.bookingId,
      bookingCode: b.bookingCode,

      amount: Number(b.totalAmount),

      routeName: b.routeName,
      departureDatetime: b.departureDatetime,
      arrivalDatetime: b.arrivalDatetime,

      pickupPointName: b.pickupPointName,
      pickupPointAddress: b.pickupPointAddress,

      dropoffPointName: b.dropoffPointName,
      dropoffPointAddress: b.dropoffPointAddress,

      vehicleName: b.vehicleName,
      licensePlate: b.licensePlate,

      seatNumbers: b.seatNumbers,
    })),
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
    await sendPaymentResultSideEffects({
      bookingIds: result.bookingIds,
      isPaid: payload.status === "SUCCESS",
    });
  }

  return result;
}
