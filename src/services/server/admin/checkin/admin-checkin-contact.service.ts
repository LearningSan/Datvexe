import { withTransaction } from "@/lib/server/mysql";

import {
  findContactBookingForUpdate,
  findPassengerContactHistory,
  findUpdatedContactSnapshot,
  hasRemainingUncheckedSeats,
  insertPassengerContactLog,
  updateBookingContactSnapshot,
} from "@/repositories/admin/checkin/checkin-contact.repo";

import { getCheckinTimePhase } from "@/services/server/admin/checkin/admin-checkin-time.service";

import type {
  PassengerContactHistoryResponse,
  PassengerContactStatus,
  UpdatePassengerContactPayload,
  UpdatePassengerContactResponse,
} from "@/types/admin/checkin/checkin-operation.type";

export async function updatePassengerContact(
  payload: UpdatePassengerContactPayload & {
    contactedBy: number;
  },
): Promise<UpdatePassengerContactResponse> {
  validateAdminUser(payload.contactedBy);

  return withTransaction(async (conn) => {
    const booking = await findContactBookingForUpdate(conn, {
      bookingId: payload.bookingId,
      tripId: payload.tripId,
    });

    if (!booking) {
      throw new Error("Không tìm thấy booking trong chuyến xe này");
    }

    validateBookingCanBeContacted({
      bookingStatus: booking.bookingStatus,
      paymentStatus: booking.paymentStatus,
      tripStatus: booking.tripStatus,
    });

    const hasUncheckedSeats = await hasRemainingUncheckedSeats(
      conn,
      payload.bookingId,
    );

    if (!hasUncheckedSeats) {
      throw new Error("Booking không còn ghế nào đang chờ check-in");
    }

    const newStatus: PassengerContactStatus = payload.contactResult;

    const expectedArrivalAt = normalizeExpectedArrival({
      contactStatus: newStatus,
      expectedArrivalAt: payload.expectedArrivalAt,
      departureDatetime: booking.departureDatetime,
    });

    const note = payload.note?.trim() || null;

    validateContactTransition({
      previousStatus: booking.contactStatus,

      newStatus,

      note,
    });

    await insertPassengerContactLog(conn, {
      bookingId: payload.bookingId,

      tripId: payload.tripId,

      contactType: payload.contactType,

      previousStatus: booking.contactStatus,

      newStatus,

      expectedArrivalAt,

      note,

      contactedBy: payload.contactedBy,
    });

    await updateBookingContactSnapshot(conn, {
      bookingId: payload.bookingId,

      contactStatus: newStatus,

      expectedArrivalAt,

      contactedBy: payload.contactedBy,

      note,
    });

    const updated = await findUpdatedContactSnapshot(conn, payload.bookingId);

    if (!updated) {
      throw new Error("Không thể đọc trạng thái liên hệ vừa cập nhật");
    }

    return {
      success: true,

      bookingId: Number(updated.bookingId),

      tripId: Number(updated.tripId),

      previousStatus: booking.contactStatus,

      contactStatus: updated.contactStatus,

      expectedArrivalAt: toNullableIsoString(updated.expectedArrivalAt),

      lastContactedAt: new Date(updated.lastContactedAt).toISOString(),

      lastContactedBy: Number(updated.lastContactedBy),

      lastContactedByName: updated.lastContactedByName,

      contactNote: updated.contactNote,
    };
  });
}

export async function getPassengerContactHistory(input: {
  bookingId: number;
  tripId: number;
}): Promise<PassengerContactHistoryResponse> {
  const logs = await findPassengerContactHistory(input);

  return {
    bookingId: input.bookingId,
    tripId: input.tripId,
    logs,
  };
}

function validateAdminUser(contactedBy: number): void {
  if (!Number.isInteger(contactedBy) || contactedBy <= 0) {
    throw new Error("Nhân viên liên hệ không hợp lệ");
  }
}

function validateBookingCanBeContacted(input: {
  bookingStatus: "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED";

  paymentStatus: string | null;
  tripStatus: string;
}): void {
  if (input.bookingStatus === "CANCELLED") {
    throw new Error("Booking đã bị hủy");
  }

  if (input.bookingStatus === "REFUNDED") {
    throw new Error("Booking đã được hoàn tiền");
  }

  if (input.bookingStatus !== "CONFIRMED") {
    throw new Error("Booking chưa được xác nhận");
  }

  if (input.paymentStatus !== "PAID") {
    throw new Error("Booking chưa thanh toán thành công");
  }

  if (input.tripStatus === "CANCELLED") {
    throw new Error("Chuyến xe đã bị hủy");
  }

  if (input.tripStatus === "COMPLETED") {
    throw new Error("Chuyến xe đã hoàn thành");
  }
}

function validateContactTransition(input: {
  previousStatus: PassengerContactStatus;

  newStatus: PassengerContactStatus;

  note: string | null;
}): void {
  if (input.newStatus === "CANCEL_REQUESTED" && !input.note) {
    throw new Error("Phải nhập lý do khách yêu cầu hủy vé");
  }

  /*
   * Cho phép ghi lại cùng trạng thái vì nhân viên
   * có thể gọi nhiều lần và cần lưu lịch sử mới.
   *
   * Ví dụ:
   * UNREACHABLE → UNREACHABLE
   * là hai lần gọi khác nhau.
   */
}

function normalizeExpectedArrival(input: {
  contactStatus: PassengerContactStatus;

  expectedArrivalAt?: string | null;

  departureDatetime: string | Date;
}): Date | null {
  if (input.contactStatus !== "ARRIVING_LATE") {
    return null;
  }

  if (!input.expectedArrivalAt) {
    throw new Error("Phải nhập thời gian khách dự kiến đến");
  }

  const expectedArrivalAt = new Date(input.expectedArrivalAt);

  if (Number.isNaN(expectedArrivalAt.getTime())) {
    throw new Error("Thời gian khách dự kiến đến không hợp lệ");
  }

  if (expectedArrivalAt.getTime() <= Date.now()) {
    throw new Error(
      "Thời gian khách dự kiến đến phải lớn hơn thời gian hiện tại",
    );
  }

  const timeResult = getCheckinTimePhase({
    boardingTime: input.departureDatetime,
  });

  const closeAt = new Date(timeResult.closeAt).getTime();

  /*
   * Cho phép nhân viên ghi nhận khách báo đến sau giờ đóng,
   * nhưng không có nghĩa là khách được tự động check-in.
   *
   * Không chặn expectedArrivalAt > closeAt để vẫn phản ánh
   * đúng nội dung cuộc gọi.
   */

  void closeAt;

  return expectedArrivalAt;
}

function toNullableIsoString(value: string | Date | null): string | null {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}
