import type { PoolConnection } from "mysql2/promise";

import { withTransaction } from "@/lib/server/mysql";

import {
  findNoShowCandidateTrips,
  findNoShowSeatsForUpdate,
  findNoShowTripForUpdate,
  insertNoShowCheckinLogs,
  updateBookingSeatsToNoShow,
  type NoShowSeatForUpdateRow,
} from "@/repositories/admin/checkin/checkin-no-show.repo";

import { createNotification } from "@/repositories/client/notification.repo";

import { buildNoShowNotificationMessage } from "./checkin-no-show-message.service";

import type {
  NoShowTripProcessItem,
  ProcessCheckinNoShowsResponse,
} from "@/types/admin/checkin/checkin-no-show.type";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

const DEFAULT_GRACE_MINUTES = 30;
const MAX_GRACE_MINUTES = 180;

type NoShowNotificationItem = {
  userId: number;
  tripId: number;

  bookingCode: string;
  seatNumber: string;

  departureDatetime: string | Date;
};

type ProcessedTripResult = {
  status: "PROCESSED" | "SKIPPED";

  processedSeatCount: number;
  processedBookingCount: number;

  notifications: NoShowNotificationItem[];

  message?: string;
};

/**
 * Tìm và xử lý toàn bộ chuyến đã quá thời gian check-in.
 */
export async function processCheckinNoShows(input?: {
  limit?: number;
  graceMinutes?: number;
}): Promise<ProcessCheckinNoShowsResponse> {
  const limit = normalizeLimit(input?.limit);

  const graceMinutes = normalizeGraceMinutes(input?.graceMinutes);

  const candidates = await findNoShowCandidateTrips(limit, graceMinutes);

  const results: NoShowTripProcessItem[] = [];

  /*
   * Không gửi thông báo ngay trong từng booking hoặc từng ghế.
   *
   * Toàn bộ dữ liệu thông báo sẽ được gom lại, sau đó nhóm theo:
   *
   * userId + tripId
   */
  const notificationItems: NoShowNotificationItem[] = [];

  let processedTrips = 0;
  let processedSeatCount = 0;
  let processedBookingCount = 0;

  let failedCount = 0;
  let skippedCount = 0;

  for (const candidate of candidates) {
    const tripId = Number(candidate.tripId);

    try {
      const result = await withTransaction(async (conn) =>
        processSingleTripNoShow(conn, {
          tripId,
          graceMinutes,
        }),
      );

      if (result.status === "PROCESSED") {
        processedTrips += 1;

        processedSeatCount += result.processedSeatCount;

        processedBookingCount += result.processedBookingCount;

        /*
         * Chỉ gom dữ liệu.
         * Chưa tạo notification ở đây.
         */
        notificationItems.push(...result.notifications);
      } else {
        skippedCount += 1;
      }

      results.push({
        tripId,
        status: result.status,

        processedSeatCount: result.processedSeatCount,

        processedBookingCount: result.processedBookingCount,

        message: result.message,
      });
    } catch (error: unknown) {
      failedCount += 1;

      const message =
        error instanceof Error
          ? error.message
          : "Không thể xử lý hành khách vắng mặt";

      console.error("[PROCESS CHECKIN NO SHOW ERROR]", {
        tripId,
        error,
      });

      results.push({
        tripId,
        status: "FAILED",

        processedSeatCount: 0,
        processedBookingCount: 0,

        message,
      });
    }
  }

  /*
   * Sau khi tất cả chuyến đã xử lý xong,
   * mới gom và gửi notification.
   *
   * Mỗi user + trip chỉ có một notification.
   */
  await dispatchGroupedNoShowNotifications(notificationItems);

  return {
    success: true,

    scannedTrips: candidates.length,
    processedTrips,

    processedSeatCount,
    processedBookingCount,

    failedCount,
    skippedCount,

    results,
  };
}

/**
 * Xử lý NO_SHOW cho một chuyến.
 */
async function processSingleTripNoShow(
  conn: PoolConnection,
  input: {
    tripId: number;
    graceMinutes: number;
  },
): Promise<ProcessedTripResult> {
  const trip = await findNoShowTripForUpdate(conn, input.tripId);

  if (!trip) {
    return {
      status: "SKIPPED",

      processedSeatCount: 0,
      processedBookingCount: 0,

      notifications: [],

      message: "Không tìm thấy chuyến",
    };
  }

  if (trip.tripStatus === "CANCELLED") {
    return {
      status: "SKIPPED",

      processedSeatCount: 0,
      processedBookingCount: 0,

      notifications: [],

      message: "Chuyến đã bị hủy",
    };
  }

  if (!hasPassedGracePeriod(trip.departureDatetime, input.graceMinutes)) {
    return {
      status: "SKIPPED",

      processedSeatCount: 0,
      processedBookingCount: 0,

      notifications: [],

      message: "Chưa hết thời gian gia hạn check-in",
    };
  }

  /*
   * Repository phải khóa các ghế bằng FOR UPDATE.
   *
   * Chỉ lấy:
   * - booking CONFIRMED
   * - payment PAID
   * - checkin_status NOT_CHECKED_IN
   */
  const seats = await findNoShowSeatsForUpdate(conn, input.tripId);

  if (seats.length === 0) {
    return {
      status: "SKIPPED",

      processedSeatCount: 0,
      processedBookingCount: 0,

      notifications: [],

      message: "Không còn ghế chờ check-in",
    };
  }

  const bookingSeatIds = seats.map((seat) => Number(seat.bookingSeatId));

  const affectedRows = await updateBookingSeatsToNoShow(conn, bookingSeatIds);

  if (affectedRows !== seats.length) {
    throw new Error(
      `Số ghế cập nhật không khớp: dự kiến ${seats.length}, thực tế ${affectedRows}`,
    );
  }

  /*
   * Ghi audit log cho từng ghế:
   *
   * NOT_CHECKED_IN → NO_SHOW
   * action = BULK_MARK_NO_SHOW
   */
  await insertNoShowCheckinLogs(conn, seats);

  /*
   * Chỉ tạo dữ liệu thông báo.
   * Không gọi createNotification tại đây.
   */
  const notifications = buildNoShowNotificationItems(
    seats,
    trip.departureDatetime,
  );

  /*
   * Một booking có thể có nhiều ghế.
   * Do đó phải dùng Set để đếm số booking.
   */
  const bookingIds = new Set(seats.map((seat) => Number(seat.bookingId)));

  return {
    status: "PROCESSED",

    processedSeatCount: seats.length,
    processedBookingCount: bookingIds.size,

    notifications,
  };
}

/**
 * Chuyển danh sách ghế thành dữ liệu notification.
 *
 * Mỗi ghế là một item tạm thời.
 * Việc gom theo userId + tripId được thực hiện sau.
 */
function buildNoShowNotificationItems(
  seats: NoShowSeatForUpdateRow[],
  departureDatetime: string | Date,
): NoShowNotificationItem[] {
  const items: NoShowNotificationItem[] = [];

  for (const seat of seats) {
    const userId = seat.userId == null ? null : Number(seat.userId);

    const tripId = Number(seat.tripId);

    /*
     * Booking khách không đăng nhập không có userId,
     * nên không gửi thông báo in-app.
     */
    if (userId == null || !Number.isInteger(userId) || userId <= 0) {
      continue;
    }

    if (!Number.isInteger(tripId) || tripId <= 0) {
      continue;
    }

    items.push({
      userId,
      tripId,

      bookingCode: seat.bookingCode,
      seatNumber: seat.seatNumber,

      departureDatetime,
    });
  }

  return items;
}

/**
 * Gom và gửi thông báo.
 *
 * Khóa nhóm:
 *
 * userId:tripId
 *
 * Ví dụ:
 *
 * Booking 125, 126, 127
 * cùng userId = 23
 * cùng tripId = 644
 *
 * sẽ tạo đúng một notification.
 */
async function dispatchGroupedNoShowNotifications(
  items: NoShowNotificationItem[],
): Promise<void> {
  if (items.length === 0) {
    return;
  }

  const groups = new Map<
    string,
    {
      userId: number;
      tripId: number;

      bookingCodes: Set<string>;
      seatNumbers: Set<string>;

      departureDatetime: string | Date;
    }
  >();

  for (const item of items) {
    const key = `${item.userId}:${item.tripId}`;

    const existing = groups.get(key);

    if (existing) {
      existing.bookingCodes.add(item.bookingCode);

      existing.seatNumbers.add(item.seatNumber);

      continue;
    }

    groups.set(key, {
      userId: item.userId,
      tripId: item.tripId,

      bookingCodes: new Set([item.bookingCode]),

      seatNumbers: new Set([item.seatNumber]),

      departureDatetime: item.departureDatetime,
    });
  }

  console.log("[NO SHOW NOTIFICATION GROUPS]", {
    rawItemCount: items.length,
    groupCount: groups.size,

    groups: [...groups.values()].map((group) => ({
      userId: group.userId,
      tripId: group.tripId,

      bookingCodes: [...group.bookingCodes],

      seatNumbers: [...group.seatNumbers],
    })),
  });

  for (const group of groups.values()) {
    try {
      await withTransaction(async (conn) => {
        const bookingCodes = [...group.bookingCodes];

        const seatNumbers = [...group.seatNumbers];

        const message = buildNoShowNotificationMessage({
          departureDatetime: group.departureDatetime,

          bookingCodes,
          seatNumbers,
        });

        console.log("[CREATE NO SHOW NOTIFICATION]", {
          userId: group.userId,
          tripId: group.tripId,

          bookingCodes,
          seatNumbers,
        });

        /*
         * createNotification chỉ được gọi đúng một lần
         * cho mỗi userId + tripId.
         */
        await createNotification(conn, {
          userId: group.userId,

          title: message.title,
          content: message.content,

          type: "CHECKIN",
        });
      });
    } catch (error: unknown) {
      /*
       * Ghế đã được chuyển NO_SHOW thành công.
       * Lỗi notification không nên làm cron trả lỗi toàn bộ.
       */
      console.error("[CREATE NO SHOW NOTIFICATION ERROR]", {
        userId: group.userId,
        tripId: group.tripId,
        error,
      });
    }
  }
}

/**
 * Kiểm tra chuyến đã qua thời gian gia hạn hay chưa.
 */
function hasPassedGracePeriod(
  departureDatetime: string | Date,
  graceMinutes: number,
): boolean {
  const departureTimestamp = new Date(departureDatetime).getTime();

  if (!Number.isFinite(departureTimestamp)) {
    return false;
  }

  const graceTimestamp = departureTimestamp + graceMinutes * 60 * 1000;

  return Date.now() >= graceTimestamp;
}

function normalizeLimit(value?: number): number {
  if (value == null || !Number.isInteger(value) || value <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(value, MAX_LIMIT);
}

function normalizeGraceMinutes(value?: number): number {
  if (value == null || !Number.isInteger(value) || value < 0) {
    return DEFAULT_GRACE_MINUTES;
  }

  return Math.min(value, MAX_GRACE_MINUTES);
}
