import { withTransaction } from "@/lib/server/mysql";

import {
  findPassengerCheckinForUpdate,
  findUpdatedPassengerCheckin,
  insertPassengerCheckinLog,
  updatePassengerCheckinSnapshot,
} from "@/repositories/admin/checkin/checkin-passenger-operation.repo";

import type {
  CheckinLogAction,
  CheckinStatus,
  PassengerCheckinAction,
  UpdatePassengerCheckinPayload,
  UpdatePassengerCheckinResponse,
} from "@/types/admin/checkin/checkin-operation.type";

interface ResolvedCheckinAction {
  newStatus: CheckinStatus;
  logAction: CheckinLogAction;

  checkedInAt: Date | null;
  checkedInBy: number | null;

  message: string;
}

export async function updatePassengerCheckin(
  payload: UpdatePassengerCheckinPayload & {
    performedBy: number;
  },
): Promise<UpdatePassengerCheckinResponse> {
  validatePositiveInteger(payload.bookingSeatId, "bookingSeatId");
  validatePositiveInteger(payload.performedBy, "Nhân viên thao tác");

  const note = normalizeNote(payload.note);

  return withTransaction(async (conn) => {
    const passenger = await findPassengerCheckinForUpdate(
      conn,
      payload.bookingSeatId,
    );

    if (!passenger) {
      throw new Error("Không tìm thấy hành khách hoặc ghế đặt vé");
    }

    validatePassengerCanBeUpdated({
      bookingStatus: passenger.bookingStatus,
      paymentStatus: passenger.paymentStatus,
      tripStatus: passenger.tripStatus,
    });

    const resolvedAction = resolveCheckinAction({
      action: payload.action,
      currentStatus: passenger.checkinStatus,
      performedBy: payload.performedBy,
    });

    await insertPassengerCheckinLog(conn, {
      bookingSeatId: passenger.bookingSeatId,
      bookingId: passenger.bookingId,
      tripId: passenger.tripId,

      previousStatus: passenger.checkinStatus,
      newStatus: resolvedAction.newStatus,

      action: resolvedAction.logAction,

      reason: note,

      performedBy: payload.performedBy,
    });

    await updatePassengerCheckinSnapshot(conn, {
      bookingSeatId: passenger.bookingSeatId,

      checkinStatus: resolvedAction.newStatus,

      checkedInAt: resolvedAction.checkedInAt,
      checkedInBy: resolvedAction.checkedInBy,

      checkinNote: note,
    });

    const updated = await findUpdatedPassengerCheckin(
      conn,
      payload.bookingSeatId,
    );

    if (!updated) {
      throw new Error("Không thể đọc trạng thái check-in vừa cập nhật");
    }

    return {
      success: true,
      message: resolvedAction.message,

      bookingSeatId: Number(updated.bookingSeatId),
      bookingId: Number(updated.bookingId),
      tripId: Number(updated.tripId),

      previousStatus: passenger.checkinStatus,
      checkinStatus: updated.checkinStatus,

      checkedInAt: toNullableIsoString(updated.checkedInAt),

      checkedInBy:
        updated.checkedInBy == null ? null : Number(updated.checkedInBy),

      checkedInByName: updated.checkedInByName,

      checkinNote: updated.checkinNote,
    };
  });
}

function resolveCheckinAction(input: {
  action: PassengerCheckinAction;
  currentStatus: CheckinStatus;
  performedBy: number;
}): ResolvedCheckinAction {
  switch (input.action) {
    case "CHECK_IN": {
      if (input.currentStatus === "CHECKED_IN") {
        throw new Error("Hành khách đã được check-in");
      }

      return {
        newStatus: "CHECKED_IN",
        logAction: "CHECK_IN",

        checkedInAt: new Date(),
        checkedInBy: input.performedBy,

        message: "Check-in hành khách thành công",
      };
    }

    case "UNDO_CHECK_IN": {
      if (input.currentStatus !== "CHECKED_IN") {
        throw new Error("Chỉ có thể hoàn tác đối với hành khách đã check-in");
      }

      return {
        newStatus: "NOT_CHECKED_IN",
        logAction: "UNDO_CHECK_IN",

        checkedInAt: null,
        checkedInBy: null,

        message: "Đã hoàn tác check-in của hành khách",
      };
    }

    case "NO_SHOW": {
      if (input.currentStatus === "NO_SHOW") {
        throw new Error("Hành khách đã được đánh dấu vắng mặt");
      }

      return {
        newStatus: "NO_SHOW",
        logAction: "MARK_NO_SHOW",

        checkedInAt: null,
        checkedInBy: null,

        message: "Đã đánh dấu hành khách vắng mặt",
      };
    }

    case "REJECT": {
      if (input.currentStatus === "REJECTED") {
        throw new Error("Hành khách đã bị từ chối lên xe");
      }

      return {
        newStatus: "REJECTED",
        logAction: "REJECT_BOARDING",

        checkedInAt: null,
        checkedInBy: null,

        message: "Đã từ chối hành khách lên xe",
      };
    }
  }
}

function validatePassengerCanBeUpdated(input: {
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

function validatePositiveInteger(value: number, fieldName: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${fieldName} không hợp lệ`);
  }
}

function normalizeNote(value?: string | null): string | null {
  if (value == null) {
    return null;
  }

  const note = value.trim();

  if (!note) {
    return null;
  }

  if (note.length > 255) {
    throw new Error("Ghi chú không được vượt quá 255 ký tự");
  }

  return note;
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
