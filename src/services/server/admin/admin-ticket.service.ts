import {
  addTicketSeatsRepo,
  cancelTicketHoldsRepo,
  changeTicketSeatsRepo,
  checkinBookingRepo,
  checkinSeatRepo,
  createNotificationForBookingUser,
  createOfflineTicketRepo,
  createTicketHistory,
  extendTicketHoldRepo,
  findAdminTicketDetail,
  findAdminTicketByBookingCode,
  findAdminTicketOptions,
  findAdminTickets,
  findAvailableSeatsByBookingTrip,
  findTicketBase,
  getAdminTicketWarnings,
  getCancelTicketPreviewRepo,
  getChangeTicketPreviewRepo,
  getTicketPaymentSummaryRepo,
  getTripPassengerListRepo,
  getTripSeatListRepo,
  changeTicketTripRepo,
  undoCheckinBookingRepo,
  undoCheckinSeatRepo,
  markLatestPaymentPaidRepo,
  releaseExpiredHoldsRepo,
  releaseTicketSeatsRepo,
  removeTicketSeatRepo,
  syncTripAvailableSeatsRepo,
  updatePickupDropoffRepo,
  updateTicketStatusRepo,
  getOfflineTicketPreviewRepo,
} from "@/repositories/admin/ticket.repo";

import type {
  AdminTicketListParams,
  UpdateTicketStatusPayload,
  CancelTicketPayload,
  ExtendTicketHoldPayload,
  AddTicketSeatsPayload,
  ChangeTicketSeatsPayload,
  UpdatePickupDropoffPayload,
  CreateOfflineTicketPayload,
} from "@/types/admin/tickets/ticket-management.type";

export async function getAdminTickets(params: AdminTicketListParams) {
  return await findAdminTickets(params);
}

export async function getAdminTicketOptions() {
  return await findAdminTicketOptions();
}

export async function getAdminTicketWarningsService() {
  return await getAdminTicketWarnings();
}

export async function getAdminTicketDetail(bookingId: number) {
  const data = await findAdminTicketDetail(bookingId);
  if (!data) throw new Error("Không tìm thấy vé");
  return data;
}

export async function updateAdminTicketStatus(
  bookingId: number,
  payload: UpdateTicketStatusPayload,
) {
  const booking = await findTicketBase(bookingId);
  if (!booking) throw new Error("Không tìm thấy booking");

  if (payload.status === "CANCELLED" && !payload.reason?.trim()) {
    throw new Error("Cần nhập lý do hủy vé");
  }

  if (payload.status === "CONFIRMED" && payload.markPaymentPaid) {
    await markLatestPaymentPaidRepo(bookingId);
  }

  await updateTicketStatusRepo(bookingId, payload.status, payload.reason);

  if (payload.status === "CANCELLED") {
    await releaseTicketSeatsRepo(bookingId);
    await cancelTicketHoldsRepo(bookingId);
    await createNotificationForBookingUser(
      bookingId,
      "Vé đã bị hủy",
      payload.reason || "Booking của bạn đã được hủy.",
    );
  }

  await createTicketHistory({
    bookingId,
    actionType: "UPDATE_STATUS",
    oldValue: { status: booking.status },
    newValue: payload,
    reason: payload.reason,
  });

  return { bookingId, status: payload.status };
}

export async function cancelAdminTicket(
  bookingId: number,
  payload: CancelTicketPayload,
) {
  const booking = await findTicketBase(bookingId);
  if (!booking) throw new Error("Không tìm thấy booking");

  await updateTicketStatusRepo(bookingId, "CANCELLED", payload.reason);
  await releaseTicketSeatsRepo(bookingId);
  await cancelTicketHoldsRepo(bookingId);

  if (payload.notifyCustomer) {
    await createNotificationForBookingUser(
      bookingId,
      "Vé đã bị hủy",
      `Lý do: ${payload.reason}`,
    );
  }

  await createTicketHistory({
    bookingId,
    actionType: "CANCEL",
    oldValue: { status: booking.status },
    newValue: payload,
    reason: payload.reason,
  });

  return { bookingId };
}

export async function extendAdminTicketHold(
  bookingId: number,
  payload: ExtendTicketHoldPayload,
) {
  const booking = await findTicketBase(bookingId);
  if (!booking) throw new Error("Không tìm thấy booking");
  if (booking.status !== "PENDING")
    throw new Error("Chỉ gia hạn giữ chỗ cho vé PENDING");

  const data = await extendTicketHoldRepo(bookingId, payload.minutes);

  await createTicketHistory({
    bookingId,
    actionType: "EXTEND_HOLD",
    newValue: payload,
    reason: `Gia hạn ${payload.minutes} phút`,
  });

  return data;
}

export async function cancelAdminTicketHold(bookingId: number) {
  await cancelTicketHoldsRepo(bookingId);
  await createTicketHistory({
    bookingId,
    actionType: "CANCEL_HOLD",
    reason: "Hủy giữ chỗ bởi admin",
  });
  return { bookingId };
}

export async function releaseExpiredTicketHolds() {
  return await releaseExpiredHoldsRepo();
}

export async function addAdminTicketSeats(
  bookingId: number,
  payload: AddTicketSeatsPayload,
) {
  const result = await addTicketSeatsRepo(bookingId, payload);
  await createTicketHistory({
    bookingId,
    actionType: "ADD_SEAT",
    newValue: payload,
  });
  return result;
}

export async function changeAdminTicketSeats(
  bookingId: number,
  payload: ChangeTicketSeatsPayload,
) {
  const result = await changeTicketSeatsRepo(bookingId, payload);
  await createTicketHistory({
    bookingId,
    actionType: "CHANGE_SEAT",
    newValue: payload,
  });
  return result;
}

export async function removeAdminTicketSeat(
  bookingId: number,
  bookingSeatId: number,
) {
  const result = await removeTicketSeatRepo(bookingId, bookingSeatId);
  await createTicketHistory({
    bookingId,
    actionType: "REMOVE_SEAT",
    oldValue: { bookingSeatId },
  });
  return result;
}

export async function syncAdminTicketTripSeats(bookingId: number) {
  const booking = await findTicketBase(bookingId);
  if (!booking) throw new Error("Không tìm thấy booking");
  await syncTripAvailableSeatsRepo(booking.trip_id);
  return { bookingId, tripId: booking.trip_id };
}

export async function updateAdminTicketPickupDropoff(
  bookingId: number,
  payload: UpdatePickupDropoffPayload,
) {
  const result = await updatePickupDropoffRepo(
    bookingId,
    payload.pickupPointId,
    payload.dropoffPointId,
  );
  await createTicketHistory({
    bookingId,
    actionType: "UPDATE_PICKUP_DROPOFF",
    newValue: payload,
  });
  return result;
}

export async function checkinAdminTicket(bookingId: number) {
  const detail = await getAdminTicketDetail(bookingId);
  if (detail.bookingStatus !== "CONFIRMED") {
    throw new Error("Chỉ vé đã xác nhận mới được check-in");
  }

  const result = await checkinBookingRepo(bookingId);
  await createTicketHistory({ bookingId, actionType: "CHECKIN_BOOKING" });
  return result;
}

export async function checkinAdminTicketSeat(
  bookingId: number,
  bookingSeatId: number,
) {
  const detail = await getAdminTicketDetail(bookingId);
  if (detail.bookingStatus !== "CONFIRMED") {
    throw new Error("Chỉ vé đã xác nhận mới được check-in");
  }

  const result = await checkinSeatRepo(bookingId, bookingSeatId);
  await createTicketHistory({
    bookingId,
    actionType: "CHECKIN_SEAT",
    newValue: { bookingSeatId },
  });
  return result;
}

export async function createAdminOfflineTicket(
  payload: CreateOfflineTicketPayload,
) {
  return await createOfflineTicketRepo(payload);
}

export async function resendAdminTicket(bookingId: number) {
  const detail = await getAdminTicketDetail(bookingId);

  const message = `Mã vé của bạn là ${detail.bookingCode}. Tuyến ${detail.routeName}, khởi hành ${detail.departureDatetime}. Ghế: ${
    detail.seats.map((seat) => seat.seatNumber).join(", ") || "chưa có ghế"
  }.`;

  await createNotificationForBookingUser(bookingId, "Gửi lại vé xe", message);

  await createTicketHistory({
    bookingId,
    actionType: "RESEND_TICKET",
    newValue: {
      bookingCode: detail.bookingCode,
      customerPhone: detail.contactPhone,
      customerEmail: detail.contactEmail,
    },
    reason: "Admin gửi lại vé cho khách",
  });

  return {
    bookingId,
    bookingCode: detail.bookingCode,
    customerName: detail.contactName,
    customerPhone: detail.contactPhone,
    customerEmail: detail.contactEmail,
    notificationCreated: !!detail.userId,
    notificationMessage: detail.userId
      ? "Đã tạo notification cho tài khoản khách hàng. Kiểm tra bảng notifications hoặc chuông thông báo khách."
      : "Khách vãng lai/offline không có user_id nên không tạo notification nội bộ. Có thể dùng thông tin này để gửi SMS/Email thật sau.",
    sentAt: new Date().toISOString(),
  };
}

export async function searchAdminTicketForCheckin(bookingCode: string) {
  if (!bookingCode?.trim()) throw new Error("Vui lòng nhập mã booking");
  const ticket = await findAdminTicketByBookingCode(bookingCode.trim());
  if (!ticket) throw new Error("Không tìm thấy vé");
  return ticket;
}

export async function getAvailableSeatsForAdminTicket(bookingId: number) {
  return await findAvailableSeatsByBookingTrip(bookingId);
}

export async function getAdminTicketPrintHtml(bookingId: number) {
  const detail = await getAdminTicketDetail(bookingId);

  const seatText =
    detail.seats.map((s) => s.seatNumber).join(", ") || "Chưa có ghế";
  const html = `
    <html>
      <head>
        <meta charset="utf-8" />
        <title>Vé ${detail.bookingCode}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
          .ticket { max-width: 720px; border: 1px solid #ddd; border-radius: 16px; padding: 24px; }
          h1 { margin: 0 0 8px; color: #0f8a5f; }
          .code { font-size: 24px; font-weight: 800; margin-bottom: 16px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .box { background: #f7faf8; padding: 12px; border-radius: 10px; }
          .label { color: #667085; font-size: 12px; }
          .value { font-weight: 700; margin-top: 4px; }
        </style>
      </head>
      <body>
        <div class="ticket">
          <h1>XeKhachPT</h1>
          <div class="code">${detail.bookingCode}</div>
          <div class="grid">
            <div class="box"><div class="label">Khách hàng</div><div class="value">${detail.contactName}</div></div>
            <div class="box"><div class="label">Số điện thoại</div><div class="value">${detail.contactPhone}</div></div>
            <div class="box"><div class="label">Tuyến</div><div class="value">${detail.routeName}</div></div>
            <div class="box"><div class="label">Khởi hành</div><div class="value">${detail.departureDatetime}</div></div>
            <div class="box"><div class="label">Ghế</div><div class="value">${seatText}</div></div>
            <div class="box"><div class="label">Tổng tiền</div><div class="value">${detail.totalAmount}</div></div>
            <div class="box"><div class="label">Điểm đón</div><div class="value">${detail.pickupPointName || ""}</div></div>
            <div class="box"><div class="label">Điểm trả</div><div class="value">${detail.dropoffPointName || ""}</div></div>
          </div>
        </div>
      </body>
    </html>
  `;

  return { html };
}

export async function getCancelAdminTicketPreview(bookingId: number) {
  return await getCancelTicketPreviewRepo(bookingId);
}

export async function getChangeAdminTicketPreview(
  bookingId: number,
  payload: {
    newTripId?: number;
    newSeatLayoutDetailIds?: number[];
    pickupPointId?: number | null;
    dropoffPointId?: number | null;
  },
) {
  return await getChangeTicketPreviewRepo(bookingId, payload);
}

export async function changeAdminTicketTrip(
  bookingId: number,
  payload: {
    newTripId: number;
    oldBookingSeatIds: number[];
    newSeatLayoutDetailIds: number[];
    pickupPointId?: number | null;
    dropoffPointId?: number | null;
    reason?: string;
  },
) {
  const result = await changeTicketTripRepo(bookingId, payload);

  await createTicketHistory({
    bookingId,
    actionType: "CHANGE_TRIP",
    oldValue: {
      oldBookingSeatIds: payload.oldBookingSeatIds,
    },
    newValue: payload,
    reason: payload.reason,
  });

  await createNotificationForBookingUser(
    bookingId,
    "Vé của bạn đã được đổi",
    "Thông tin chuyến, ghế hoặc điểm đón/trả của booking đã được cập nhật.",
  );

  return result;
}

export async function undoCheckinAdminTicket(bookingId: number) {
  const result = await undoCheckinBookingRepo(bookingId);
  await createTicketHistory({ bookingId, actionType: "UNDO_CHECKIN_BOOKING" });
  return result;
}

export async function undoCheckinAdminTicketSeat(
  bookingId: number,
  bookingSeatId: number,
) {
  const result = await undoCheckinSeatRepo(bookingId, bookingSeatId);
  await createTicketHistory({
    bookingId,
    actionType: "UNDO_CHECKIN_SEAT",
    newValue: { bookingSeatId },
  });
  return result;
}

export async function getAdminTripPassengerList(tripId: number) {
  return await getTripPassengerListRepo(tripId);
}

export async function getAdminTripSeatList(tripId: number) {
  return await getTripSeatListRepo(tripId);
}

export async function getAdminTicketPayments(bookingId: number) {
  return await getTicketPaymentSummaryRepo(bookingId);
}

export async function getAdminTicketHistories(bookingId: number) {
  const detail = await getAdminTicketDetail(bookingId);
  return detail.histories;
}
export async function getAdminOfflineTicketPreview(tripId: number) {
  return await getOfflineTicketPreviewRepo(tripId);
}
