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

import type { PaymentWebhookInput } from "@/validators/client/payment.validator";

export async function handlePaymentWebhook(
  payload: PaymentWebhookInput,
): Promise<{ success: boolean }> {
  const existing = await findPaymentByTransactionCode(payload.transactionCode);

  if (!existing) {
    throw new Error("Transaction không tồn tại");
  }

  if (existing.status === "PAID" || existing.status === "FAILED") {
    return { success: true };
  }

  const isPaid = payload.status === "SUCCESS";

  await withTransaction(async (conn) => {
    await updatePaymentByWebhook(conn, existing.paymentId, {
      status: isPaid ? "PAID" : "FAILED",
      paidAt: isPaid ? new Date() : null,
      gatewayTransactionId: payload.gatewayTransactionId,
      gatewayResponse:
        typeof payload.gatewayResponse === "string"
          ? payload.gatewayResponse
          : JSON.stringify(payload.gatewayResponse ?? {}),
    });

    await updateBookingStatus(
      conn,
      existing.bookingId,
      isPaid ? "CONFIRMED" : "CANCELLED",
    );

    if (isPaid) {
      const holds = await findSeatHoldsByBooking(existing.bookingId);

      if (!holds.length) {
        throw new Error("Không tìm thấy ghế đang giữ");
      }

      await insertBookingSeatsWebhook(
        conn,
        existing.bookingId,
        holds[0].tripId,
        holds.map((s) => ({
          seatLayoutDetailId: s.seatLayoutDetailId,
          seatPrice: s.seatPrice,
        })),
      );

      await deleteSeatHoldsByBooking(conn, existing.bookingId);
    }

    const bookingInfo = await findBookingByIdForNotification(
      existing.bookingId,
    );

    if (bookingInfo?.userId) {
      await createNotification(conn, {
        userId: bookingInfo.userId,
        type: isPaid ? "PAYMENT" : "BOOKING",
        title: isPaid ? "Thanh toán thành công" : "Thanh toán thất bại",
        content: isPaid
          ? `Thanh toán thành công! Mã vé của bạn là ${bookingInfo.bookingCode}.`
          : `Giao dịch thất bại. Vé ${bookingInfo.bookingCode} đã bị hủy.`,
      });
    }
  });

  const bookingInfo = await findBookingByIdForNotification(existing.bookingId);

  if (isPaid && bookingInfo?.contactEmail) {
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

  return { success: true };
}
