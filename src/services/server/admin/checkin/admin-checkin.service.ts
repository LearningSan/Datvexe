import { withTransaction } from "@/lib/server/mysql";

import { parseAndVerifyCheckinQr } from "@/lib/server/checkin-qr";

import {
  findBookingForCheckinUpdate,
  findBookingSeatsForCheckinUpdate,
  findCheckinBookingByIdentity,
  findCheckinSeatsByBookingId,
  updateBookingSeatsCheckedIn,
} from "@/repositories/admin/checkin/checkin.repo";

import type {
  AdminCheckinLookupResponse,
  CheckinEligibility,
  ConfirmCheckinPayload,
  ConfirmCheckinResponse,
  LookupCheckinQrPayload,
} from "@/types/admin/checkin/checkin.type";

const CHECKIN_OPEN_BEFORE_MINUTES = 120;
const CHECKIN_LATE_AFTER_MINUTES = 30;

export async function lookupAdminCheckinQr(
  payload: LookupCheckinQrPayload,
): Promise<AdminCheckinLookupResponse> {
  const qrPayload = parseAndVerifyCheckinQr(payload.qrData);

  const booking = await findCheckinBookingByIdentity({
    bookingId: qrPayload.bookingId,
    bookingCode: qrPayload.bookingCode,
  });

  if (!booking) {
    throw new Error("Không tìm thấy vé tương ứng với mã QR");
  }

  const seats = await findCheckinSeatsByBookingId(booking.bookingId);

  if (!seats.length) {
    throw new Error("Booking chưa có ghế đã xác nhận");
  }

  const eligibilityResult = evaluateCheckinEligibility({
    bookingStatus: booking.bookingStatus,
    paymentStatus: booking.paymentStatus,
    tripStatus: booking.tripStatus,
    tripId: booking.tripId,
    expectedTripId: payload.expectedTripId,
    departureDatetime: booking.departureDatetime,
    allSeatsCheckedIn: seats.every(
      (seat) => seat.checkinStatus === "CHECKED_IN",
    ),
  });

  const checkedInSeats = seats.filter(
    (seat) => seat.checkinStatus === "CHECKED_IN",
  ).length;

  return {
    bookingId: Number(booking.bookingId),
    bookingCode: booking.bookingCode,
    tripId: Number(booking.tripId),

    passengerName: booking.passengerName,
    passengerPhone: booking.passengerPhone,
    passengerEmail: booking.passengerEmail,

    routeName: `${booking.originCity} → ${booking.destinationCity}`,

    departureDatetime: new Date(booking.departureDatetime).toISOString(),

    arrivalDatetime: booking.arrivalDatetime
      ? new Date(booking.arrivalDatetime).toISOString()
      : null,

    pickupPointName: booking.pickupPointName,

    pickupPointAddress: booking.pickupPointAddress,

    dropoffPointName: booking.dropoffPointName,

    dropoffPointAddress: booking.dropoffPointAddress,

    vehicleName: booking.vehicleName,

    licensePlate: booking.licensePlate,

    bookingStatus: booking.bookingStatus,

    paymentStatus: booking.paymentStatus,

    tripStatus: booking.tripStatus,

    eligibility: eligibilityResult.eligibility,

    eligibilityMessage: eligibilityResult.message,

    totalSeats: seats.length,
    checkedInSeats,
    remainingSeats: seats.length - checkedInSeats,

    seats: seats.map((seat) => ({
      ...seat,

      canCheckin:
        eligibilityResult.eligibility === "ELIGIBLE" &&
        seat.checkinStatus === "NOT_CHECKED_IN",
    })),
  };
}

export async function confirmAdminCheckin(
  payload: ConfirmCheckinPayload & {
    checkedInBy: number;
  },
): Promise<ConfirmCheckinResponse> {
  if (!Number.isInteger(payload.checkedInBy) || payload.checkedInBy <= 0) {
    throw new Error("Nhân viên check-in không hợp lệ");
  }

  return withTransaction(async (conn) => {
    const booking = await findBookingForCheckinUpdate(conn, payload.bookingId);

    if (!booking) {
      throw new Error("Booking không tồn tại");
    }

    const eligibility = evaluateCheckinEligibility({
      bookingStatus: booking.bookingStatus,

      paymentStatus: booking.paymentStatus,

      tripStatus: booking.tripStatus,

      tripId: Number(booking.tripId),

      departureDatetime: booking.departureDatetime,

      allSeatsCheckedIn: false,
    });

    if (
      eligibility.eligibility !== "ELIGIBLE" &&
      eligibility.eligibility !== "ALREADY_CHECKED_IN"
    ) {
      throw new Error(eligibility.message);
    }

    const seats = await findBookingSeatsForCheckinUpdate(conn, {
      bookingId: payload.bookingId,

      bookingSeatIds: payload.bookingSeatIds,
    });

    if (seats.length !== payload.bookingSeatIds.length) {
      throw new Error("Có ghế không thuộc booking này");
    }

    const alreadyCheckedInSeatIds = seats
      .filter((seat) => seat.checkinStatus === "CHECKED_IN")
      .map((seat) => Number(seat.bookingSeatId));

    const invalidSeats = seats.filter(
      (seat) =>
        seat.checkinStatus !== "NOT_CHECKED_IN" &&
        seat.checkinStatus !== "CHECKED_IN",
    );

    if (invalidSeats.length) {
      throw new Error("Có ghế đang ở trạng thái không cho phép check-in");
    }

    const checkedInSeatIds = seats
      .filter((seat) => seat.checkinStatus === "NOT_CHECKED_IN")
      .map((seat) => Number(seat.bookingSeatId));

    await updateBookingSeatsCheckedIn(conn, {
      bookingSeatIds: checkedInSeatIds,

      checkedInBy: payload.checkedInBy,

      note: payload.note?.trim() || null,
    });

    return {
      success: true,
      bookingId: payload.bookingId,

      checkedInSeatIds,

      alreadyCheckedInSeatIds,

      checkedInCount: checkedInSeatIds.length,

      alreadyCheckedInCount: alreadyCheckedInSeatIds.length,
    };
  });
}

function evaluateCheckinEligibility(input: {
  bookingStatus: "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED";

  paymentStatus: string | null;
  tripStatus: string;

  tripId: number;
  expectedTripId?: number;

  departureDatetime: string | Date;

  allSeatsCheckedIn: boolean;
}): {
  eligibility: CheckinEligibility;
  message: string;
} {
  if (input.bookingStatus === "CANCELLED") {
    return {
      eligibility: "BOOKING_CANCELLED",

      message: "Vé đã bị hủy, không thể check-in.",
    };
  }

  if (input.bookingStatus === "REFUNDED") {
    return {
      eligibility: "BOOKING_REFUNDED",

      message: "Vé đã được hoàn tiền, không thể check-in.",
    };
  }

  if (input.bookingStatus !== "CONFIRMED" || input.paymentStatus !== "PAID") {
    return {
      eligibility: "UNPAID",

      message: "Vé chưa được thanh toán hoặc chưa xác nhận.",
    };
  }

  if (
    input.expectedTripId &&
    Number(input.expectedTripId) !== Number(input.tripId)
  ) {
    return {
      eligibility: "WRONG_TRIP",

      message: "Vé hợp lệ nhưng không thuộc chuyến đang check-in.",
    };
  }

  if (input.tripStatus === "CANCELLED") {
    return {
      eligibility: "TRIP_CANCELLED",

      message: "Chuyến xe đã bị hủy.",
    };
  }

  if (input.tripStatus === "COMPLETED") {
    return {
      eligibility: "TRIP_COMPLETED",

      message: "Chuyến xe đã hoàn thành.",
    };
  }

  if (input.allSeatsCheckedIn) {
    return {
      eligibility: "ALREADY_CHECKED_IN",

      message: "Tất cả ghế trong booking đã được check-in.",
    };
  }

  const departureTime = new Date(input.departureDatetime).getTime();

  if (Number.isFinite(departureTime)) {
    const openAt = departureTime - CHECKIN_OPEN_BEFORE_MINUTES * 60 * 1000;

    const lateUntil = departureTime + CHECKIN_LATE_AFTER_MINUTES * 60 * 1000;

    const now = Date.now();

    if (now < openAt) {
      return {
        eligibility: "TOO_EARLY",

        message: `Chưa đến thời gian check-in. Check-in mở trước giờ khởi hành ${CHECKIN_OPEN_BEFORE_MINUTES} phút.`,
      };
    }

    if (now > lateUntil) {
      return {
        eligibility: "TOO_LATE",

        message: "Đã quá thời gian check-in cho phép.",
      };
    }
  }

  return {
    eligibility: "ELIGIBLE",
    message: "Vé hợp lệ và có thể check-in.",
  };
}
