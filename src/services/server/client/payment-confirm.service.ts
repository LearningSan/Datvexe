import type mysql from "mysql2/promise";

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

export async function confirmPaymentByTransactionCode(params: {
  conn: mysql.PoolConnection;
  transactionCode: string;
  status: "SUCCESS" | "FAILED";
  amount?: number;
  gatewayTransactionId: string;
  gatewayResponse: unknown;
}) {
  const existing = await findPaymentByTransactionCode(params.transactionCode);

  if (!existing) {
    throw new Error("Transaction không tồn tại");
  }

  if (existing.status === "PAID" || existing.status === "FAILED") {
    return {
      success: true,
      bookingId: existing.bookingId,
      alreadyProcessed: true,
    };
  }

  if (
    typeof params.amount === "number" &&
    Number(existing.amount) !== Number(params.amount)
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

  const holds = await findSeatHoldsByBooking(existing.bookingId);

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

  if (bookingInfo?.userId) {
    await createNotification(null as any, {
      userId: bookingInfo.userId,
      type: params.isPaid ? "PAYMENT" : "BOOKING",
      title: params.isPaid ? "Thanh toán thành công" : "Thanh toán thất bại",
      content: params.isPaid
        ? `Thanh toán thành công! Mã vé của bạn là ${bookingInfo.bookingCode}.`
        : `Giao dịch thất bại. Vé ${bookingInfo.bookingCode} đã bị hủy.`,
    });
  }

  if (params.isPaid && bookingInfo?.contactEmail) {
    await sendPaymentSuccessEmail({
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
  }
}
