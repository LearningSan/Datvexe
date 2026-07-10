import { withTransaction } from "@/lib/server/mysql";
import {
  insertBookingShuttleBulk,
  findBookingSummaryRaw,
  checkSeatsAlreadyBooked,
  checkSeatsAlreadyHeld,
  insertSeatHolds,
  updateTripHoldCount,
  findBookingForHoldCancel,
  cancelPendingBooking,
  countHeldSeatsBySession,
  deleteSeatHoldsBySession,
  restoreTripAvailableSeats,
  findExistingSeatHolds,
  deleteBookingPromotionsByBooking,
  insertBookingPromotion,
  findPromotionByCode,
} from "@/repositories/client/booking.repo";

import {
  checkSeatsNotHeld,
  checkSeatsHeldBySession,
} from "@/repositories/client/seat-hold.repo";
import {
  createBooking,
  findTripById,
} from "@/repositories/client/booking.repo";
import { createShuttleRequest } from "@/repositories/client/shuttle.repo";

import type { BookingPaymentSummary } from "@/types/client/payment/payment.type";

import { HoldSeatsPayload } from "@/types/client/booking/hold-seat.type";
import { CreateBookingInput } from "@/validators/client/booking.validator";
import { formatDateTimeVN } from "@/lib/client/helpers";
export async function holdSeats(
  payload: HoldSeatsPayload,
  userId: number | null,
) {
  const { tripId, seatLayoutDetailIds, sessionId } = payload;

  return await withTransaction(async (conn) => {
    const booked = await checkSeatsAlreadyBooked(
      conn,
      tripId,
      seatLayoutDetailIds,
    );

    if (booked.length > 0) {
      throw new Error("SEATS_ALREADY_BOOKED");
    }

    const held = await checkSeatsAlreadyHeld(
      conn,
      tripId,
      seatLayoutDetailIds,
      sessionId,
    );

    if (held.length > 0) {
      throw new Error("SEATS_ALREADY_HELD");
    }

    const existingOwnHolds = await findExistingSeatHolds(
      conn,
      tripId,
      seatLayoutDetailIds,
    );

    const ownHeldSeatIds = existingOwnHolds
      .filter((h) => h.session_id === sessionId)
      .map((h) => h.seat_layout_detail_id);

    const newSeatIds = seatLayoutDetailIds.filter(
      (id) => !ownHeldSeatIds.includes(id),
    );

    await insertSeatHolds(conn, {
      tripId,
      seatIds: seatLayoutDetailIds,
      sessionId,
      userId,
    });

    if (newSeatIds.length > 0)
      await updateTripHoldCount(conn, tripId, newSeatIds.length);

    return {
      tripId,
      seatCount: seatLayoutDetailIds.length,
      expiresIn: 720,
    };
  });
}
export async function createBookingShuttleBulk(payload: any) {
  return await insertBookingShuttleBulk(payload);
}

export async function getBookingPaymentSummary(
  bookingId: number,
): Promise<BookingPaymentSummary> {
  const row = await findBookingSummaryRaw(bookingId);

  if (!row) {
    throw new Error("Booking không tồn tại");
  }

  const seatNumbers = row.seatNumbersRaw ? row.seatNumbersRaw.split(",") : [];
  const discountAmount = Number(row.discount_amount || 0);
  const totalAmount = Number(row.total_amount || 0);
  const subtotalAmount = totalAmount + discountAmount;

  return {
    bookingId: row.booking_id,
    bookingCode: row.booking_code,

    tripId: row.trip_id,
    vehicleTypeName: row.vehicle_type_name ?? "Chưa cập nhật",

    routeName: `${row.origin_city} → ${row.destination_city}`,

    departureDatetime: formatDateTimeVN(row.departure_datetime),
    arrivalDatetime: formatDateTimeVN(row.arrival_datetime),

    passengerName: row.contact_name,
    passengerPhone: row.contact_phone,
    passengerEmail: row.contact_email,

    seatCount: Number(row.seat_count),
    seatNumbers,

    pickupPointName: row.pickup_point_name,
    pickupPointAddress: row.pickup_point_address,

    dropoffPointName: row.dropoff_point_name,
    dropoffPointAddress: row.dropoff_point_address,

    ticketPrice: Number(row.ticket_price),
    discountAmount,
    subtotalAmount,
    totalAmount,

    holdExpiredAt: new Date(row.hold_expired_at).toISOString(),
    bookingStatus: row.status,

    paymentMethod: row.payment_method ?? null,
    paymentStatus: row.payment_status ?? null,
    transactionCode: row.transaction_code ?? null,
    paidAt: row.paid_at ? new Date(row.paid_at).toISOString() : null,

    vehicleName: row.vehicle_name ?? null,
    licensePlate: row.license_plate ?? null,
    tripStatus: row.trip_status ?? null,
    tripTicketPrice: row.trip_ticket_price
      ? Number(row.trip_ticket_price)
      : null,

    bookingType: row.booking_type,
    pickupMethod: row.pickup_method,
    dropoffMethod: row.dropoff_method,
    createdAt: new Date(row.created_at).toISOString(),
    cancelReason: row.cancel_reason ?? null,
  };
}
export async function cancelHold(
  bookingId: number | null,
  sessionId: string,
  tripId: number,
) {
  return await withTransaction(async (conn) => {
    if (bookingId) {
      const bookingRows = await findBookingForHoldCancel(conn, bookingId);
      const booking = bookingRows[0];
      if (!booking) {
        throw new Error("BOOKING_NOT_FOUND");
      }

      if (booking.status !== "PENDING") {
        throw new Error("BOOKING_NOT_VALID");
      }

      await cancelPendingBooking(conn, bookingId);
      await deleteBookingPromotionsByBooking(conn, bookingId);
    }
    const heldSeatCount = await countHeldSeatsBySession(
      conn,
      sessionId,
      tripId,
    );

    if (heldSeatCount <= 0) {
      return true;
    }

    await deleteSeatHoldsBySession(conn, sessionId, tripId);

    await restoreTripAvailableSeats(conn, tripId, heldSeatCount);
    return true;
  });
}
export async function createPendingBooking(
  payload: CreateBookingInput,
  userId: number | null,
) {
  return withTransaction(async (conn) => {
    const trip = await findTripById(conn, payload.tripId);

    if (!trip) {
      throw new Error("TRIP_NOT_FOUND");
    }

    const seatIds = payload.seats.map((s) => s.seatLayoutDetailId);

    // ======================================================
    // 1. CHECK BOOKED
    // ======================================================
    const booked = await checkSeatsAlreadyBooked(conn, payload.tripId, seatIds);

    if (booked.length > 0) {
      throw new Error("SEATS_ALREADY_BOOKED");
    }

    // ======================================================
    // 2. CHECK HELD BY OTHERS
    // ======================================================
    const heldByOthers = await checkSeatsNotHeld(
      conn,
      payload.tripId,
      seatIds,
      payload.sessionId,
    );

    if (heldByOthers.length > 0) {
      throw new Error("SEATS_ALREADY_HELD");
    }

    // ======================================================
    // 3. CHECK USER OWNS HOLD (IMPORTANT)
    // ======================================================
    const heldBySession = await checkSeatsHeldBySession(
      conn,
      payload.tripId,
      seatIds,
      payload.sessionId,
    );

    if (heldBySession.length !== seatIds.length) {
      throw new Error("SEAT_HOLD_NOT_FOUND");
    }

    // ======================================================
    // 4. CREATE BOOKING
    // ======================================================
    const subtotal = payload.seats.reduce(
      (sum, seat) => sum + seat.seatPrice,
      0,
    );

    let discountAmount = 0;
    let promotionId: number | null = null;

    if (payload.promoCode) {
      const promotion = await findPromotionByCode(conn, payload.promoCode);

      if (!promotion) {
        throw new Error("PROMOTION_NOT_FOUND");
      }

      if (subtotal < Number(promotion.minOrderAmount)) {
        throw new Error("MIN_ORDER_NOT_ENOUGH");
      }

      promotionId = promotion.promotionId;

      if (promotion.discountType === "PERCENT") {
        discountAmount = subtotal * (Number(promotion.discountValue) / 100);
      } else {
        discountAmount = Number(promotion.discountValue);
      }

      discountAmount = Math.min(discountAmount, subtotal);
    }

    const totalAmount = subtotal - discountAmount;

    const bookingCode = "BK" + Date.now().toString().slice(-10);

    const holdExpiredAt = new Date(Date.now() + 10 * 60 * 1000);

    const bookingId = await createBooking(conn, {
      bookingCode,
      userId: userId ?? null,
      tripId: payload.tripId,

      pickupPointId: payload.pickup.pickupPointId ?? null,
      dropoffPointId: payload.dropoff.pickupPointId ?? null,

      pickupMethod: payload.pickup.method,
      dropoffMethod: payload.dropoff.method,

      seatPrice: payload.seats[0].seatPrice,

      totalAmount,

      contactName: payload.contactName,
      contactPhone: payload.contactPhone,
      contactEmail: payload.contactEmail,
      holdExpiredAt,
    });
    if (promotionId && discountAmount > 0) {
      await insertBookingPromotion(conn, {
        bookingId,
        promotionId,
        discountAmount,
      });
    }
    await conn.query(
      `
  UPDATE seat_holds
  SET booking_id = ?
  WHERE trip_id = ?
    AND seat_layout_detail_id IN (${seatIds.map(() => "?").join(",")})
    AND session_id = ?
  `,
      [bookingId, payload.tripId, ...seatIds, payload.sessionId],
    );

    // ======================================================
    // 7. SHUTTLE
    // ======================================================
    if (payload.pickup.method === "SHUTTLE") {
      await createShuttleRequest(conn, {
        bookingId,
        type: "PICKUP",
        address: payload.pickup.address!,
        latitude: payload.pickup.latitude,
        longitude: payload.pickup.longitude,
      });
    }

    if (payload.dropoff.method === "SHUTTLE") {
      await createShuttleRequest(conn, {
        bookingId,
        type: "DROPOFF",
        address: payload.dropoff.address!,
        latitude: payload.dropoff.latitude,
        longitude: payload.dropoff.longitude,
      });
    }

    return {
      bookingId,
      bookingCode,
      holdExpiredAt,
    };
  });
}
