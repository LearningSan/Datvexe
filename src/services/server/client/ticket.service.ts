import { withTransaction } from "@/lib/server/mysql";

import {
  findBookingForUser,
  findBookingForUpdate,
  findBookingSeats,
  findTripForUpdate,
  cancelBooking,
  deleteBookingSeats,
  increaseTripAvailableSeats,
  markPaymentRefunded,
  createNotification,
  findWalletForUpdate,
  refundToWallet,
  findTripById,
  getChangeBookingForUpdate,
  getChangeOldTripForUpdate,
  getChangeNewTripForUpdate,
  getChangeBookingSeats,
  getChangeAvailableSeats,
  getChangeBookedSeatIds,
  getChangeHeldSeatIds,
  removeChangeOldBookingSeats,
  removeChangeOldSeatHolds,
  addChangeBookingSeat,
  restoreChangeOldTripSeats,
  reserveChangeNewTripSeats,
  updateBookingForChange,
  getChangeWalletForUpdate,
  addChangeRefundToWallet,
  createChangeNotification,
  getChangeAvailableSeatsForPreview,
  getChangeBookedSeatsForPreview,
  getChangeBookingForPreview,
  getChangeBookingSeatsForPreview,
  getChangeHeldSeatsForPreview,
  getChangeTripByIdForPreview,
  findRelatedBookingsByBookingId,
} from "@/repositories/client/ticket.repo";

import type {
  CancelTicketResponse,
  ChangeTicketPreview,
  ChangeTicketPayload,
  ChangeTicketResponse,
  BookingForAction,
  TripForChange,
} from "@/types/client/ticket/ticket.type";
import type { PaymentMethodType } from "@/types/client/payment/payment.type";
const MIN_CANCEL_HOURS = 2;

const CANCEL_FEE_48H = 0;
const CANCEL_FEE_24H = 0;
const CANCEL_FEE_2H = 10;

const CHANGE_FEE = 0;

function calculateHoursUntilDeparture(departureDatetime: string | Date) {
  const departure = new Date(departureDatetime).getTime();
  const now = Date.now();
  return (departure - now) / (1000 * 60 * 60);
}

/**
 * ============================================================
 * TÍNH PHÍ HỦY
 *
 * >= 48h       : 0%
 * 24h - <48h   : 0%
 * 2h - <24h     : 10%
 * <2h           : không được hủy
 * ============================================================
 */
function calculateCancelFeePercent(hoursUntilDeparture: number) {
  if (hoursUntilDeparture < MIN_CANCEL_HOURS) {
    throw new Error("CANCEL_TOO_LATE");
  }

  if (hoursUntilDeparture < 24) {
    return CANCEL_FEE_2H;
  }

  if (hoursUntilDeparture < 48) {
    return CANCEL_FEE_24H;
  }

  return CANCEL_FEE_48H;
}

/**
 * ============================================================
 * TÍNH TIỀN HOÀN
 * ============================================================
 */
function calculateRefund(totalAmount: number, hoursUntilDeparture: number) {
  const feePercent = calculateCancelFeePercent(hoursUntilDeparture);

  const cancelFee = (totalAmount * feePercent) / 100;

  const refundAmount = totalAmount - cancelFee;

  return {
    feePercent,
    cancelFee,
    refundAmount,
  };
}

export async function previewCancelTicket(userId: number, bookingId: number) {
  const booking = await findBookingForUser(userId, bookingId);

  if (!booking) {
    throw new Error("BOOKING_NOT_FOUND");
  }

  if (
    booking.bookingStatus === "CANCELLED" ||
    booking.bookingStatus === "REFUNDED"
  ) {
    throw new Error("BOOKING_ALREADY_CANCELLED");
  }

  if (booking.bookingStatus !== "CONFIRMED") {
    throw new Error("BOOKING_NOT_CANCELLABLE");
  }

  if (
    booking.tripStatus === "RUNNING" ||
    booking.tripStatus === "COMPLETED" ||
    booking.tripStatus === "CANCELLED"
  ) {
    throw new Error("TRIP_NOT_CANCELLABLE");
  }

  return await withTransaction(async (conn) => {
    const { paymentId, bookingIds } = await findRelatedBookingsByBookingId(
      conn,
      bookingId,
    );

    const relatedBookings: BookingForAction[] = [];

    for (const relatedBookingId of bookingIds) {
      const relatedBooking = await findBookingForUpdate(
        conn,
        userId,
        relatedBookingId,
      );

      if (!relatedBooking) {
        throw new Error("BOOKING_NOT_FOUND");
      }

      relatedBookings.push(relatedBooking);
    }

    for (const relatedBooking of relatedBookings) {
      if (
        relatedBooking.bookingStatus === "CANCELLED" ||
        relatedBooking.bookingStatus === "REFUNDED"
      ) {
        throw new Error("BOOKING_ALREADY_CANCELLED");
      }

      if (relatedBooking.bookingStatus !== "CONFIRMED") {
        throw new Error("BOOKING_NOT_CANCELLABLE");
      }

      if (
        relatedBooking.tripStatus === "RUNNING" ||
        relatedBooking.tripStatus === "COMPLETED" ||
        relatedBooking.tripStatus === "CANCELLED"
      ) {
        throw new Error("TRIP_NOT_CANCELLABLE");
      }
    }
    const refundPreviews = relatedBookings.map((relatedBooking) => {
      // Thời gian từ HIỆN TẠI đến thời gian KHỞI HÀNH CỦA BOOKING NÀY
      const hoursUntilDeparture = calculateHoursUntilDeparture(
        relatedBooking.departureDatetime,
      );

      const canCancel = hoursUntilDeparture > 2;

      // Booking này đã quá hạn hủy
      if (!canCancel) {
        return {
          bookingId: relatedBooking.bookingId,
          bookingCode: relatedBooking.bookingCode,
          bookingStatus: relatedBooking.bookingStatus,

          departureDatetime: relatedBooking.departureDatetime,
          hoursUntilDeparture,

          originalAmount: Number(relatedBooking.totalAmount),

          feePercent: 0,
          cancelFee: 0,
          refundAmount: 0,

          canCancel: false,
        };
      }

      // Booking này vẫn còn đủ thời gian hủy
      const refund = calculateRefund(
        Number(relatedBooking.totalAmount),
        hoursUntilDeparture,
      );

      return {
        bookingId: relatedBooking.bookingId,
        bookingCode: relatedBooking.bookingCode,
        bookingStatus: relatedBooking.bookingStatus,

        departureDatetime: relatedBooking.departureDatetime,
        hoursUntilDeparture,

        originalAmount: Number(relatedBooking.totalAmount),

        feePercent: refund.feePercent,
        cancelFee: refund.cancelFee,
        refundAmount: refund.refundAmount,

        canCancel: true,
      };
    });

    const invalidBooking = refundPreviews.find((item) => !item.canCancel);

    /**
     * ----------------------------------------------------------
     * 6. LẤY PREVIEW CỦA BOOKING HIỆN TẠI
     * ----------------------------------------------------------
     */
    const currentBookingPreview = refundPreviews.find(
      (item) => item.bookingId === bookingId,
    );

    if (!currentBookingPreview) {
      throw new Error("BOOKING_NOT_FOUND");
    }

    /**
     * ----------------------------------------------------------
     * 7. CÓ BOOKING QUÁ HẠN HỦY
     * ----------------------------------------------------------
     *
     * Đây KHÔNG phải exception.
     *
     * Preview vẫn trả HTTP 200 để FE có thể hiển thị
     * chính xác lý do không thể hủy.
     */
    if (invalidBooking) {
      const message =
        bookingIds.length > 1
          ? `Không thể hủy vé. Vé ${invalidBooking.bookingCode} vì đã quá hạn hủy (còn ${Math.max(
              0,
              invalidBooking.hoursUntilDeparture,
            ).toFixed(
              1,
            )} giờ trước khi khởi hành). Vì vậy không thể hủy các vé được đặt cùng payment.`
          : "Không thể hủy vé vì phải hủy trước ít nhất 2 giờ so với thời gian khởi hành.";

      return {
        bookingId: currentBookingPreview.bookingId,

        bookingCode: currentBookingPreview.bookingCode,

        bookingStatus: currentBookingPreview.bookingStatus,

        departureDatetime: currentBookingPreview.departureDatetime,

        hoursUntilDeparture: currentBookingPreview.hoursUntilDeparture,

        originalAmount: currentBookingPreview.originalAmount,

        feePercent: currentBookingPreview.feePercent,

        cancelFee: currentBookingPreview.cancelFee,

        refundAmount: 0,

        refundMethod: "NONE" as const,

        paymentId,

        relatedBookingCount: bookingIds.length,

        canCancel: false,

        message,
      };
    }

    /**
     * ----------------------------------------------------------
     * 8. TẤT CẢ BOOKING ĐỀU CÓ THỂ HỦY
     * ----------------------------------------------------------
     */
    const relatedBooking = relatedBookings.find(
      (item) => item.bookingId !== bookingId,
    );

    const message =
      bookingIds.length > 1 && relatedBooking
        ? `Nếu hủy vé này thì vé ${relatedBooking.bookingCode} cũng sẽ bị hủy vì 2 vé này được đặt cùng lúc.`
        : "Số tiền hoàn sẽ được cộng vào ví nội bộ.";

    return {
      bookingId: currentBookingPreview.bookingId,

      bookingCode: currentBookingPreview.bookingCode,

      bookingStatus: currentBookingPreview.bookingStatus,

      departureDatetime: currentBookingPreview.departureDatetime,

      hoursUntilDeparture: currentBookingPreview.hoursUntilDeparture,

      originalAmount: currentBookingPreview.originalAmount,

      feePercent: currentBookingPreview.feePercent,

      cancelFee: currentBookingPreview.cancelFee,

      refundAmount: currentBookingPreview.refundAmount,

      refundMethod: "INTERNAL_WALLET" as const,

      paymentId,

      relatedBookingCount: bookingIds.length,

      canCancel: true,

      message,
    };
  });
}

/**
 * ============================================================
 * HỦY VÉ
 *
 * Mọi phương thức thanh toán:
 *
 * MOMO
 * ZALOPAY
 * VNPAY
 * PAYOS
 * VIETQR
 * INTERNAL_WALLET
 * CASH
 *
 * đều hoàn tiền vào ví nội bộ.
 * ============================================================
 */
export async function cancelUserTicket(
  userId: number,
  bookingId: number,
): Promise<CancelTicketResponse> {
  return await withTransaction(async (conn) => {
    /**
     * ----------------------------------------------------------
     * 1. LẤY PAYMENT + TẤT CẢ BOOKING LIÊN QUAN
     * ----------------------------------------------------------
     */
    const { paymentId, bookingIds } = await findRelatedBookingsByBookingId(
      conn,
      bookingId,
    );

    /**
     * ----------------------------------------------------------
     * 2. LOCK TẤT CẢ BOOKING
     * ----------------------------------------------------------
     */
    const sortedBookingIds = [...bookingIds].sort((a, b) => a - b);

    const lockedBookings: BookingForAction[] = [];

    for (const relatedBookingId of sortedBookingIds) {
      const booking = await findBookingForUpdate(
        conn,
        userId,
        relatedBookingId,
      );

      if (!booking) {
        throw new Error(
          relatedBookingId === bookingId
            ? "BOOKING_NOT_FOUND"
            : "RELATED_BOOKING_NOT_FOUND",
        );
      }

      lockedBookings.push(booking);
    }

    /**
     * ----------------------------------------------------------
     * 3. VALIDATE TẤT CẢ BOOKING
     * ----------------------------------------------------------
     */
    for (const booking of lockedBookings) {
      if (
        booking.bookingStatus === "CANCELLED" ||
        booking.bookingStatus === "REFUNDED"
      ) {
        throw new Error("BOOKING_ALREADY_CANCELLED");
      }

      if (booking.bookingStatus !== "CONFIRMED") {
        throw new Error("BOOKING_NOT_CANCELLABLE");
      }
    }

    /**
     * ----------------------------------------------------------
     * 4. LOCK TẤT CẢ TRIP
     * ----------------------------------------------------------
     */
    const tripIds = [
      ...new Set(lockedBookings.map((booking) => booking.tripId)),
    ].sort((a, b) => a - b);

    const lockedTrips = new Map<number, TripForChange>();

    for (const tripId of tripIds) {
      const trip = await findTripForUpdate(conn, tripId);

      if (!trip) {
        throw new Error("TRIP_NOT_FOUND");
      }

      lockedTrips.set(tripId, trip);
    }

    /**
     * ----------------------------------------------------------
     * 5. VALIDATE TẤT CẢ TRIP
     * ----------------------------------------------------------
     */
    for (const trip of lockedTrips.values()) {
      if (
        trip.status === "RUNNING" ||
        trip.status === "COMPLETED" ||
        trip.status === "CANCELLED"
      ) {
        throw new Error("TRIP_NOT_CANCELLABLE");
      }
    }

    /**
     * ----------------------------------------------------------
     * 6. KIỂM TRA THỜI GIAN TẤT CẢ TRIP
     *
     * Chỉ cần 1 trip <= 2 giờ
     * => không cho hủy toàn bộ.
     * ----------------------------------------------------------
     */
    for (const booking of lockedBookings) {
      const trip = lockedTrips.get(booking.tripId);

      if (!trip) {
        throw new Error("TRIP_NOT_FOUND");
      }

      const hoursUntilDeparture = calculateHoursUntilDeparture(
        trip.departureDatetime,
      );

      if (hoursUntilDeparture <= 2) {
        throw new Error("CANCEL_TOO_LATE");
      }
    }

    /**
     * ----------------------------------------------------------
     * 7. TÍNH REFUND CHO TỪNG BOOKING
     * ----------------------------------------------------------
     */
    let totalOriginalAmount = 0;
    let totalCancelFee = 0;
    let totalRefundAmount = 0;

    const refundResults = new Map<
      number,
      {
        cancelFee: number;
        refundAmount: number;
        feePercent: number;
      }
    >();

    for (const booking of lockedBookings) {
      const trip = lockedTrips.get(booking.tripId);

      if (!trip) {
        throw new Error("TRIP_NOT_FOUND");
      }

      const hoursUntilDeparture = calculateHoursUntilDeparture(
        trip.departureDatetime,
      );

      const refund = calculateRefund(
        Number(booking.totalAmount),
        hoursUntilDeparture,
      );

      refundResults.set(booking.bookingId, refund);

      totalOriginalAmount += Number(booking.totalAmount);
      totalCancelFee += refund.cancelFee;
      totalRefundAmount += refund.refundAmount;
    }

    /**
     * ----------------------------------------------------------
     * 8. HỦY TẤT CẢ BOOKING
     * ----------------------------------------------------------
     */
    for (const booking of lockedBookings) {
      const refund = refundResults.get(booking.bookingId);

      if (!refund) {
        throw new Error("REFUND_CALCULATION_FAILED");
      }

      const bookingSeats = await findBookingSeats(conn, booking.bookingId);

      const seatCount = bookingSeats.length;

      /**
       * Hủy booking
       */
      await cancelBooking(
        conn,
        booking.bookingId,
        `Hủy vé - phí hủy ${refund.feePercent}%`,
      );

      /**
       * Xóa ghế
       */
      await deleteBookingSeats(conn, booking.bookingId);

      /**
       * Xóa hold
       */

      /**
       * Trả ghế
       */
      if (seatCount > 0) {
        await increaseTripAvailableSeats(conn, booking.tripId, seatCount);
      }
    }

    /**
     * ----------------------------------------------------------
     * 9. HOÀN TIỀN
     * ----------------------------------------------------------
     */
    let refundMethod: "INTERNAL_WALLET" | "NONE" = "NONE";

    if (totalRefundAmount > 0) {
      const wallet = await findWalletForUpdate(conn, userId);

      if (!wallet) {
        throw new Error("WALLET_NOT_FOUND");
      }

      if (wallet.status !== "ACTIVE") {
        throw new Error("WALLET_LOCKED");
      }

      for (const booking of lockedBookings) {
        const refund = refundResults.get(booking.bookingId);

        if (!refund || refund.refundAmount <= 0) {
          continue;
        }

        await refundToWallet(
          conn,
          wallet.walletId,
          booking.bookingId,
          refund.refundAmount,
          `Hoàn tiền hủy vé mã ${booking.bookingCode}`,
        );
      }

      refundMethod = "INTERNAL_WALLET";
    }

    /**
     * ----------------------------------------------------------
     * 10. PAYMENT
     *
     * Chỉ xử lý 1 payment.
     * ----------------------------------------------------------
     */
    if (paymentId) {
      await markPaymentRefunded(
        conn,
        paymentId,
        totalRefundAmount > 0
          ? `Hủy ${lockedBookings.length} vé - phí hủy ${totalCancelFee}`
          : `Hủy ${lockedBookings.length} vé - không hoàn tiền`,
      );
    }

    /**
     * ----------------------------------------------------------
     * 11. 1 NOTIFICATION
     * ----------------------------------------------------------
     */
    const requestedBooking = lockedBookings.find(
      (booking) => booking.bookingId === bookingId,
    );

    if (!requestedBooking) {
      throw new Error("BOOKING_NOT_FOUND");
    }

    await createNotification(
      conn,
      userId,
      "Hủy vé thành công",
      totalRefundAmount > 0
        ? `Vé ${requestedBooking.bookingCode} và các vé liên quan đã được hủy. Đã hoàn ${totalRefundAmount.toLocaleString("vi-VN")}đ vào ví nội bộ.`
        : `Vé ${requestedBooking.bookingCode} và các vé liên quan đã được hủy. Không có tiền hoàn.`,
      "BOOKING",
    );

    /**
     * ----------------------------------------------------------
     * 12. 1 RESPONSE DUY NHẤT
     * ----------------------------------------------------------
     */
    return {
      bookingId: requestedBooking.bookingId,

      bookingCode: requestedBooking.bookingCode,

      bookingStatus: "CANCELLED",

      originalAmount: totalOriginalAmount,

      cancelFee: totalCancelFee,

      refundAmount: totalRefundAmount,

      refundMethod,

      paymentId,

      message:
        totalRefundAmount > 0
          ? `Hủy ${lockedBookings.length} vé thành công. Tiền hoàn đã được cộng vào ví nội bộ.`
          : `Hủy ${lockedBookings.length} vé thành công.`,
    };
  });
}
export async function confirmChangeTicket(
  userId: number,
  bookingId: number,
  payload: ChangeTicketPayload,
): Promise<ChangeTicketResponse> {
  const { newTripId, newSeatLayoutDetailIds } = payload;

  return withTransaction(async (conn) => {
    /**
     * ========================================================
     * 1. LOCK BOOKING
     * ========================================================
     */
    const booking = await getChangeBookingForUpdate(conn, userId, bookingId);

    if (!booking) {
      throw new Error("BOOKING_NOT_FOUND");
    }

    if (
      booking.bookingStatus === "CANCELLED" ||
      booking.bookingStatus === "REFUNDED"
    ) {
      throw new Error("BOOKING_NOT_CHANGEABLE");
    }

    if (booking.bookingStatus !== "CONFIRMED") {
      throw new Error("BOOKING_NOT_CHANGEABLE");
    }

    /**
     * ========================================================
     * 2. LOCK CHUYẾN CŨ
     * ========================================================
     */
    const oldTrip = await getChangeOldTripForUpdate(conn, booking.tripId);

    if (!oldTrip) {
      throw new Error("OLD_TRIP_NOT_FOUND");
    }

    if (
      oldTrip.status === "RUNNING" ||
      oldTrip.status === "COMPLETED" ||
      oldTrip.status === "CANCELLED"
    ) {
      throw new Error("BOOKING_NOT_CHANGEABLE");
    }

    /**
     * Chuyến cũ đã khởi hành thì không được đổi.
     */
    if (new Date(oldTrip.departureDatetime).getTime() <= Date.now()) {
      throw new Error("BOOKING_NOT_CHANGEABLE");
    }

    /**
     * ========================================================
     * 3. KHÔNG ĐƯỢC ĐỔI SANG CÙNG CHUYẾN
     * ========================================================
     */
    if (newTripId === oldTrip.tripId) {
      throw new Error("SAME_TRIP_NOT_ALLOWED");
    }

    /**
     * ========================================================
     * 4. LOCK CHUYẾN MỚI
     * ========================================================
     */
    const newTrip = await getChangeNewTripForUpdate(conn, newTripId);

    if (!newTrip) {
      throw new Error("NEW_TRIP_NOT_FOUND");
    }

    /**
     * ========================================================
     * 5. KIỂM TRA CHUYẾN MỚI
     * ========================================================
     */

    if (newTrip.status !== "OPEN") {
      throw new Error("NEW_TRIP_NOT_OPEN");
    }

    if (new Date(newTrip.departureDatetime).getTime() <= Date.now()) {
      throw new Error("NEW_TRIP_ALREADY_DEPARTED");
    }

    /**
     * Đổi vé trong cùng tuyến.
     */
    if (newTrip.routeId !== oldTrip.routeId) {
      throw new Error("NEW_TRIP_DIFFERENT_ROUTE");
    }

    /**
     * ========================================================
     * 6. LẤY GHẾ CŨ
     * ========================================================
     */
    const oldSeats = await getChangeBookingSeats(conn, bookingId);

    const seatCount = oldSeats.length;

    if (seatCount === 0) {
      throw new Error("BOOKING_HAS_NO_SEATS");
    }

    /**
     * ========================================================
     * 7. SỐ GHẾ MỚI PHẢI BẰNG SỐ GHẾ CŨ
     * ========================================================
     */
    if (newSeatLayoutDetailIds.length !== seatCount) {
      throw new Error("INVALID_NEW_SEAT_COUNT");
    }

    /**
     * Không cho chọn trùng ghế.
     */
    const uniqueSeatIds = new Set(newSeatLayoutDetailIds);

    if (uniqueSeatIds.size !== newSeatLayoutDetailIds.length) {
      throw new Error("INVALID_NEW_SEAT");
    }

    /**
     * ========================================================
     * 8. KIỂM TRA SỐ GHẾ CÒN LẠI
     * ========================================================
     */
    if (newTrip.availableSeats < seatCount) {
      throw new Error("NEW_TRIP_NOT_ENOUGH_SEATS");
    }

    /**
     * ========================================================
     * 9. KIỂM TRA GHẾ HỢP LỆ
     * ========================================================
     */
    const availableSeats = await getChangeAvailableSeats(
      conn,
      newTripId,
      newSeatLayoutDetailIds,
    );

    if (availableSeats.length !== newSeatLayoutDetailIds.length) {
      throw new Error("INVALID_NEW_SEAT");
    }

    /**
     * ========================================================
     * 10. KIỂM TRA GHẾ ĐÃ BOOK
     * ========================================================
     */
    const bookedSeatIds = await getChangeBookedSeatIds(
      conn,
      newTripId,
      newSeatLayoutDetailIds,
    );

    if (bookedSeatIds.length > 0) {
      throw new Error("NEW_SEAT_ALREADY_BOOKED");
    }

    /**
     * ========================================================
     * 11. KIỂM TRA GHẾ ĐANG HOLD
     * ========================================================
     */
    const heldSeatIds = await getChangeHeldSeatIds(
      conn,
      newTripId,
      newSeatLayoutDetailIds,
    );

    if (heldSeatIds.length > 0) {
      throw new Error("NEW_SEAT_ALREADY_HELD");
    }

    /**
     * ========================================================
     * 12. TÍNH TIỀN
     * ========================================================
     */
    const oldTotalAmount = Number(booking.totalAmount);

    const seatPrice = Number(newTrip.ticketPrice);

    const newTotalAmount = seatPrice * seatCount;

    const changeFee = CHANGE_FEE;

    const differenceAmount = newTotalAmount + changeFee - oldTotalAmount;

    /**
     * --------------------------------------------------------
     * Nếu vé mới đắt hơn:
     * hiện tại chưa hỗ trợ thanh toán thêm
     * --------------------------------------------------------
     */
    if (differenceAmount > 0) {
      throw new Error("CHANGE_PAYMENT_REQUIRED");
    }

    /**
     * Lưu lại số ghế trước khi xóa.
     */
    const oldSeatNumbers = oldSeats.map((seat) => seat.seatNumber);

    const newSeatNumbers = availableSeats.map((seat) => seat.seatNumber);

    /**
     * ========================================================
     * 13. XÓA GHẾ CŨ
     * ========================================================
     */
    await removeChangeOldBookingSeats(conn, bookingId);

    /**
     * ========================================================
     * 14. XÓA HOLD CŨ
     * ========================================================
     */
    await removeChangeOldSeatHolds(conn, bookingId);

    /**
     * ========================================================
     * 15. TRẢ GHẾ VỀ CHUYẾN CŨ
     * ========================================================
     */
    await restoreChangeOldTripSeats(conn, oldTrip.tripId, seatCount);

    /**
     * ========================================================
     * 16. TRỪ GHẾ Ở CHUYẾN MỚI
     * ========================================================
     */
    const reserveResult = await reserveChangeNewTripSeats(
      conn,
      newTrip.tripId,
      seatCount,
    );

    if (reserveResult.affectedRows !== 1) {
      throw new Error("NEW_TRIP_NOT_ENOUGH_SEATS");
    }

    /**
     * ========================================================
     * 17. TẠO GHẾ BOOKING MỚI
     * ========================================================
     */
    for (const seat of availableSeats) {
      await addChangeBookingSeat(
        conn,
        bookingId,
        newTrip.tripId,
        seat.seatLayoutDetailId,
        Number(seat.seatPrice),
      );
    }

    /**
     * ========================================================
     * 18. UPDATE BOOKING
     * ========================================================
     */
    await updateBookingForChange(
      conn,
      bookingId,
      newTrip.tripId,
      newTotalAmount,
    );

    /**
     * ========================================================
     * 19. HOÀN TIỀN NẾU VÉ MỚI RẺ HƠN
     * ========================================================
     */
    if (differenceAmount < 0) {
      const refundAmount = Math.abs(differenceAmount);

      const wallet = await getChangeWalletForUpdate(conn, userId);

      if (!wallet) {
        throw new Error("WALLET_NOT_FOUND");
      }

      if (wallet.status !== "ACTIVE") {
        throw new Error("WALLET_LOCKED");
      }

      await addChangeRefundToWallet(
        conn,
        wallet.walletId,
        bookingId,
        refundAmount,
        `Hoàn chênh lệch đổi vé mã ${booking.bookingCode}`,
      );
    }

    /**
     * ========================================================
     * 20. NOTIFICATION
     * ========================================================
     */
    if (booking.userId !== null) {
      let message = `Vé ${booking.bookingCode} đã được đổi sang chuyến mới.`;

      if (differenceAmount < 0) {
        message += ` Đã hoàn ${Math.abs(differenceAmount).toLocaleString(
          "vi-VN",
        )}đ vào ví nội bộ.`;
      }

      await createChangeNotification(
        conn,
        booking.userId,
        "Đổi vé thành công",
        message,
        "BOOKING",
      );
    }

    /**
     * ========================================================
     * 21. RESPONSE
     * ========================================================
     */
    return {
      bookingId: booking.bookingId,
      bookingCode: booking.bookingCode,

      oldTripId: oldTrip.tripId,
      newTripId: newTrip.tripId,

      oldSeatNumbers,
      newSeatNumbers,

      oldTotalAmount,
      newTotalAmount,

      changeFee,
      differenceAmount,

      bookingStatus: "CONFIRMED" as const,

      paymentId: booking.paymentId,

      message:
        differenceAmount < 0
          ? "Đổi vé thành công. Tiền chênh lệch đã được hoàn vào ví nội bộ."
          : "Đổi vé thành công.",
    };
  });
}
export async function previewChangeTicket(
  userId: number,
  bookingId: number,
  payload: ChangeTicketPayload,
): Promise<ChangeTicketPreview> {
  const { newTripId, newSeatLayoutDetailIds } = payload;

  // ============================================================
  // 1. LẤY BOOKING
  // ============================================================
  const booking = await getChangeBookingForPreview(userId, bookingId);

  if (!booking) {
    throw new Error("BOOKING_NOT_FOUND");
  }

  if (
    booking.bookingStatus === "CANCELLED" ||
    booking.bookingStatus === "REFUNDED"
  ) {
    throw new Error("BOOKING_NOT_CHANGEABLE");
  }

  if (booking.bookingStatus !== "CONFIRMED") {
    throw new Error("BOOKING_NOT_CHANGEABLE");
  }

  // ============================================================
  // 2. KIỂM TRA CHUYẾN CŨ
  // ============================================================
  if (
    booking.tripStatus === "RUNNING" ||
    booking.tripStatus === "COMPLETED" ||
    booking.tripStatus === "CANCELLED"
  ) {
    throw new Error("BOOKING_NOT_CHANGEABLE");
  }

  const oldTrip = await getChangeTripByIdForPreview(booking.tripId);

  if (!oldTrip) {
    throw new Error("OLD_TRIP_NOT_FOUND");
  }

  // ============================================================
  // 3. KHÔNG ĐƯỢC ĐỔI CÙNG CHUYẾN
  // ============================================================
  if (newTripId === booking.tripId) {
    throw new Error("SAME_TRIP_NOT_ALLOWED");
  }

  // ============================================================
  // 4. LẤY CHUYẾN MỚI
  // ============================================================
  const newTrip = await getChangeTripByIdForPreview(newTripId);

  if (!newTrip) {
    throw new Error("NEW_TRIP_NOT_FOUND");
  }

  // ============================================================
  // 5. KIỂM TRA TRẠNG THÁI CHUYẾN MỚI
  // ============================================================
  if (newTrip.status !== "OPEN") {
    throw new Error("NEW_TRIP_NOT_OPEN");
  }

  const newDeparture = new Date(newTrip.departureDatetime).getTime();

  if (newDeparture <= Date.now()) {
    throw new Error("NEW_TRIP_ALREADY_DEPARTED");
  }

  // ============================================================
  // 6. KIỂM TRA CÙNG TUYẾN
  // ============================================================
  if (newTrip.routeId !== oldTrip.routeId) {
    throw new Error("NEW_TRIP_DIFFERENT_ROUTE");
  }

  // ============================================================
  // 7. LẤY GHẾ CŨ
  // ============================================================
  const oldSeats = await getChangeBookingSeatsForPreview(bookingId);

  const seatCount = oldSeats.length;

  if (seatCount === 0) {
    throw new Error("BOOKING_HAS_NO_SEATS");
  }

  // ============================================================
  // 8. KIỂM TRA SỐ GHẾ MỚI
  // ============================================================
  if (newSeatLayoutDetailIds.length !== seatCount) {
    throw new Error("INVALID_NEW_SEAT_COUNT");
  }

  // Không cho duplicate seat
  if (new Set(newSeatLayoutDetailIds).size !== newSeatLayoutDetailIds.length) {
    throw new Error("INVALID_NEW_SEAT");
  }

  // ============================================================
  // 9. KIỂM TRA GHẾ MỚI
  // ============================================================
  const availableSeatRows = await getChangeAvailableSeatsForPreview(
    newTripId,
    newSeatLayoutDetailIds,
  );

  if (availableSeatRows.length !== newSeatLayoutDetailIds.length) {
    throw new Error("INVALID_NEW_SEAT");
  }

  // ============================================================
  // 10. KIỂM TRA GHẾ ĐÃ ĐẶT
  // ============================================================
  const bookedRows = await getChangeBookedSeatsForPreview(
    newTripId,
    newSeatLayoutDetailIds,
  );

  if (bookedRows.length > 0) {
    throw new Error("NEW_SEAT_ALREADY_BOOKED");
  }

  // ============================================================
  // 11. KIỂM TRA GHẾ ĐANG HOLD
  // ============================================================
  const heldRows = await getChangeHeldSeatsForPreview(
    newTripId,
    newSeatLayoutDetailIds,
  );

  if (heldRows.length > 0) {
    throw new Error("NEW_SEAT_ALREADY_HELD");
  }

  // ============================================================
  // 12. TÍNH GIÁ
  // ============================================================
  const oldTotalAmount = Number(booking.totalAmount);

  const newSeatPrice = Number(newTrip.ticketPrice);

  const newTotalAmount = newSeatPrice * seatCount;

  const changeFee = CHANGE_FEE;

  const differenceAmount = newTotalAmount + changeFee - oldTotalAmount;

  // ============================================================
  // 13. RESPONSE
  // ============================================================
  return {
    bookingId: booking.bookingId,
    bookingCode: booking.bookingCode,

    oldTripId: oldTrip.tripId,
    oldDepartureDatetime: oldTrip.departureDatetime,

    newTripId: newTrip.tripId,
    newDepartureDatetime: newTrip.departureDatetime,

    seatCount,

    oldSeatNumbers: oldSeats.map((seat) => seat.seatNumber),

    newSeatNumbers: availableSeatRows
      .sort(
        (a, b) =>
          newSeatLayoutDetailIds.indexOf(a.seatLayoutDetailId) -
          newSeatLayoutDetailIds.indexOf(b.seatLayoutDetailId),
      )
      .map((seat) => seat.seatNumber),

    oldTotalAmount,

    newTotalAmount,

    changeFee,

    differenceAmount,

    paymentRequired: differenceAmount > 0,

    refundRequired: differenceAmount < 0,

    paymentMethod:
      differenceAmount > 0
        ? (booking.paymentMethod as PaymentMethodType)
        : null,
  };
}
