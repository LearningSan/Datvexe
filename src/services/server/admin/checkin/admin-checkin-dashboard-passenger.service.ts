import {
  countCheckinDashboardPassengers,
  findCheckinDashboardPassengers,
  findCheckinDashboardTripInfo,
} from "@/repositories/admin/checkin/checkin-dashboard-passenger.repo";

import { getPassengerAlert } from "@/lib/server/checkin/checkin-status.helper";

import type {
  CheckinDashboardPassengerItem,
  CheckinDashboardPassengerQuery,
  CheckinDashboardPassengerRow,
  CheckinDashboardPassengersResult,
} from "@/types/admin/checkin/checkin-dashboard-passenger.type";

import type { PassengerAlertLevel } from "@/types/admin/checkin/checkin.type";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_ALERT_FILTER_ROWS = 2000;

function normalizePage(value?: number): number {
  if (!Number.isInteger(value) || Number(value) < 1) {
    return 1;
  }

  return Number(value);
}

function normalizeLimit(value?: number): number {
  if (!Number.isInteger(value) || Number(value) < 1) {
    return DEFAULT_LIMIT;
  }

  return Math.min(Number(value), MAX_LIMIT);
}

function serializeNullableDate(value: string | Date | null): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

/**
 * Chuyển kết quả helper cảnh báo sang cấu trúc API.
 *
 * getPassengerAlert() hiện trả về PassengerAlertResult,
 * không trả trực tiếp PassengerAlertLevel.
 */
function resolvePassengerAlert(
  row: CheckinDashboardPassengerRow,
  departureDatetime: string | Date,
): {
  level: PassengerAlertLevel;
  message: string | null;
} {
  const result = getPassengerAlert({
    departureDatetime,
    checkinStatus: row.checkinStatus,
    contactStatus: row.contactStatus,
    expectedArrivalAt: row.expectedArrivalAt,
  });

  return {
    level: result.level,
    message: result.message ?? null,
  };
}
function serializePassenger(
  row: CheckinDashboardPassengerRow,
  departureDatetime: string | Date,
): CheckinDashboardPassengerItem {
  const alert = resolvePassengerAlert(row, departureDatetime);

  return {
    bookingSeatId: Number(row.bookingSeatId),
    bookingId: Number(row.bookingId),
    bookingCode: row.bookingCode,

    seatNumber: row.seatNumber,

    passenger: {
      name: row.passengerName,
      phone: row.passengerPhone,
      email: row.passengerEmail,
    },

    checkin: {
      status: row.checkinStatus,
      checkedInAt: serializeNullableDate(row.checkedInAt),
      note: row.checkinNote,
    },

    contact: {
      status: row.contactStatus,
      expectedArrivalAt: serializeNullableDate(row.expectedArrivalAt),
      lastContactedAt: serializeNullableDate(row.lastContactedAt),
      note: row.contactNote,
    },

    pickup: {
      method: row.pickupMethod,
      pointName: row.pickupPointName,
      address: row.pickupAddress,
    },

    alert,
  };
}

const ALERT_PRIORITY: Record<PassengerAlertLevel, number> = {
  NORMAL: 0,
  REMINDER: 1,
  WARNING: 2,
  CRITICAL: 3,
  OVERDUE: 4,
};

function sortByAlertDescending(
  items: CheckinDashboardPassengerItem[],
): CheckinDashboardPassengerItem[] {
  return [...items].sort((left, right) => {
    const priorityDifference =
      ALERT_PRIORITY[right.alert.level] - ALERT_PRIORITY[left.alert.level];

    if (priorityDifference !== 0) {
      return priorityDifference;
    }

    return left.seatNumber.localeCompare(right.seatNumber, undefined, {
      numeric: true,
      sensitivity: "base",
    });
  });
}

function buildSummary(
  items: CheckinDashboardPassengerItem[],
): CheckinDashboardPassengersResult["summary"] {
  const summary: CheckinDashboardPassengersResult["summary"] = {
    totalSeats: items.length,

    checkedIn: 0,
    notCheckedIn: 0,
    noShow: 0,
    rejected: 0,

    normal: 0,
    reminder: 0,
    warning: 0,
    critical: 0,
    overdue: 0,
  };

  for (const item of items) {
    switch (item.checkin.status) {
      case "CHECKED_IN":
        summary.checkedIn++;
        break;

      case "NOT_CHECKED_IN":
        summary.notCheckedIn++;
        break;

      case "NO_SHOW":
        summary.noShow++;
        break;

      case "REJECTED":
        summary.rejected++;
        break;
    }

    switch (item.alert.level) {
      case "NORMAL":
        summary.normal++;
        break;

      case "REMINDER":
        summary.reminder++;
        break;

      case "WARNING":
        summary.warning++;
        break;

      case "CRITICAL":
        summary.critical++;
        break;

      case "OVERDUE":
        summary.overdue++;
        break;
    }
  }

  return summary;
}

export async function getCheckinDashboardPassengers(
  input: CheckinDashboardPassengerQuery,
): Promise<CheckinDashboardPassengersResult> {
  const trip = await findCheckinDashboardTripInfo(input.tripId);

  if (!trip) {
    throw new Error("TRIP_NOT_FOUND");
  }

  const page = normalizePage(input.page);
  const limit = normalizeLimit(input.limit);

  const keyword = input.keyword?.trim() || null;

  const checkinStatus = input.checkinStatus ?? null;

  const contactStatus = input.contactStatus ?? null;

  const alert = input.alert ?? null;

  const sort = input.sort ?? "SEAT_ASC";

  /*
   * Khi lọc theo alert hoặc sort ALERT_DESC,
   * phải đọc toàn bộ dữ liệu phù hợp rồi tính alert
   * trong TypeScript.
   */
  const requiresAlertProcessing = alert !== null || sort === "ALERT_DESC";

  if (requiresAlertProcessing) {
    const rows = await findCheckinDashboardPassengers({
      tripId: input.tripId,

      checkinStatus,
      contactStatus,
      keyword,

      offset: 0,
      limit: MAX_ALERT_FILTER_ROWS,

      sort: "SEAT_ASC",
    });

    let allItems = rows.map((row) =>
      serializePassenger(row, trip.departureDatetime),
    );

    const summary = buildSummary(allItems);

    if (alert) {
      allItems = allItems.filter((item) => item.alert.level === alert);
    }

    if (sort === "ALERT_DESC") {
      allItems = sortByAlertDescending(allItems);
    }

    const totalItems = allItems.length;
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    const offset = (page - 1) * limit;

    return {
      success: true,

      trip: {
        tripId: Number(trip.tripId),
        routeName: trip.routeName,
        departureDatetime: new Date(trip.departureDatetime).toISOString(),

        vehicleName: trip.vehicleName,
        licensePlate: trip.licensePlate,

        status: trip.tripStatus,
      },

      filters: {
        checkinStatus,
        contactStatus,
        alert,
        keyword,
        sort,
      },

      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },

      summary,

      items: allItems.slice(offset, offset + limit),

      generatedAt: new Date().toISOString(),
    };
  }

  const offset = (page - 1) * limit;

  const [totalItems, rows, allSummaryRows] = await Promise.all([
    countCheckinDashboardPassengers({
      tripId: input.tripId,
      checkinStatus,
      contactStatus,
      keyword,
    }),

    findCheckinDashboardPassengers({
      tripId: input.tripId,

      checkinStatus,
      contactStatus,
      keyword,

      offset,
      limit,

      sort,
    }),

    /*
     * Summary luôn tính trên toàn bộ dữ liệu phù hợp bộ lọc,
     * không chỉ dữ liệu của trang hiện tại.
     */
    findCheckinDashboardPassengers({
      tripId: input.tripId,

      checkinStatus,
      contactStatus,
      keyword,

      offset: 0,
      limit: MAX_ALERT_FILTER_ROWS,

      sort: "SEAT_ASC",
    }),
  ]);

  const allSummaryItems = allSummaryRows.map((row) =>
    serializePassenger(row, trip.departureDatetime),
  );

  return {
    success: true,

    trip: {
      tripId: Number(trip.tripId),
      routeName: trip.routeName,
      departureDatetime: new Date(trip.departureDatetime).toISOString(),

      vehicleName: trip.vehicleName,
      licensePlate: trip.licensePlate,

      status: trip.tripStatus,
    },

    filters: {
      checkinStatus,
      contactStatus,
      alert: null,
      keyword,
      sort,
    },

    pagination: {
      page,
      limit,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
    },

    summary: buildSummary(allSummaryItems),

    items: rows.map((row) => serializePassenger(row, trip.departureDatetime)),

    generatedAt: new Date().toISOString(),
  };
}
