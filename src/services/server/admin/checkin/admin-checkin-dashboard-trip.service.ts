import {
  countCheckinDashboardTrips,
  findCheckinDashboardTrips,
} from "@/repositories/admin/checkin/checkin-dashboard-trip.repo";

import {
  getCheckinTimePhase,
  getPassengerAlert,
} from "@/lib/server/checkin/checkin-status.helper";

import type {
  CheckinDashboardTripItem,
  CheckinDashboardTripQuery,
  CheckinDashboardTripsResult,
} from "@/types/admin/checkin/checkin-dashboard-trip.type";

import type {
  CheckinPhase,
  PassengerAlertLevel,
} from "@/types/admin/checkin/checkin-operation.type";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function toNumber(value: string | number | null): number {
  const result = Number(value ?? 0);

  return Number.isFinite(result) ? result : 0;
}

function calculateRate(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Number(((value / total) * 100).toFixed(2));
}

function formatMysqlDatetime(date: Date): string {
  const year = date.getFullYear();

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getDefaultRange(): {
  from: string;
  to: string;
} {
  const from = new Date();

  from.setHours(0, 0, 0, 0);

  const to = new Date(from);

  to.setDate(to.getDate() + 1);

  return {
    from: formatMysqlDatetime(from),
    to: formatMysqlDatetime(to),
  };
}

function normalizeRange(
  from?: string,
  to?: string,
): {
  from: string;
  to: string;
} {
  const defaultRange = getDefaultRange();

  const normalizedFrom = from?.trim() || defaultRange.from;
  const normalizedTo = to?.trim() || defaultRange.to;

  const fromDate = new Date(normalizedFrom);
  const toDate = new Date(normalizedTo);

  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) {
    throw new Error("Khoảng thời gian không hợp lệ");
  }

  if (fromDate.getTime() >= toDate.getTime()) {
    throw new Error("Thời gian bắt đầu phải nhỏ hơn thời gian kết thúc");
  }

  return {
    from: formatMysqlDatetime(fromDate),
    to: formatMysqlDatetime(toDate),
  };
}

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

function getHighestAlert(input: {
  departureDatetime: string | Date;
  notCheckedIn: number;
  arrivingLate: number;
  unreachable: number;
}): PassengerAlertLevel {
  if (input.notCheckedIn <= 0) {
    return "NORMAL";
  }

  const result = getPassengerAlert({
    departureDatetime: input.departureDatetime,
    checkinStatus: "NOT_CHECKED_IN",
    contactStatus:
      input.unreachable > 0
        ? "UNREACHABLE"
        : input.arrivingLate > 0
          ? "ARRIVING_LATE"
          : "NOT_CONTACTED",
    expectedArrivalAt: null,
  });

  return result.level;
}

function serializeTrip(
  row: Awaited<ReturnType<typeof findCheckinDashboardTrips>>[number],
): CheckinDashboardTripItem {
  const totalSeats = toNumber(row.totalSeats);
  const checkedIn = toNumber(row.checkedIn);
  const notCheckedIn = toNumber(row.notCheckedIn);
  const noShow = toNumber(row.noShow);
  const rejected = toNumber(row.rejected);

  const arrivingLate = toNumber(row.arrivingLate);
  const unreachable = toNumber(row.unreachable);

  const phase = getCheckinTimePhase(row.departureDatetime);

  return {
    tripId: Number(row.tripId),

    routeName: row.routeName,
    departureDatetime: new Date(row.departureDatetime).toISOString(),

    vehicleName: row.vehicleName,
    licensePlate: row.licensePlate,

    driverNames: row.driverNames
      ? row.driverNames
          .split(",")
          .map((name) => name.trim())
          .filter(Boolean)
      : [],

    phase,

    highestAlert: getHighestAlert({
      departureDatetime: row.departureDatetime,
      notCheckedIn,
      arrivingLate,
      unreachable,
    }),

    seats: {
      totalSeats,
      checkedIn,
      notCheckedIn,
      noShow,
      rejected,

      checkinRate: calculateRate(checkedIn, totalSeats),
      noShowRate: calculateRate(noShow, totalSeats),
    },

    contacts: {
      totalPassengers: toNumber(row.totalPassengers),

      notContacted: toNumber(row.notContacted),
      contacted: toNumber(row.contacted),
      notified: toNumber(row.notified),

      coming: toNumber(row.coming),
      arrivingLate,
      unreachable,
      cancelRequested: toNumber(row.cancelRequested),
    },
  };
}

export async function getCheckinDashboardTrips(
  input: CheckinDashboardTripQuery,
): Promise<CheckinDashboardTripsResult> {
  const range = normalizeRange(input.from, input.to);

  const page = normalizePage(input.page);
  const limit = normalizeLimit(input.limit);

  const keyword = input.keyword?.trim() || null;
  const phase = input.phase ?? null;
  const sort = input.sort ?? "DEPARTURE_ASC";

  /*
   * Khi filter phase, phải lấy tất cả chuyến trước rồi tính phase,
   * vì phase phụ thuộc vào thời gian hiện tại.
   */
  if (phase) {
    const allRows = await findCheckinDashboardTrips({
      from: range.from,
      to: range.to,
      keyword,

      offset: 0,
      limit: 1000,

      sort,
    });

    const filteredItems = allRows
      .map(serializeTrip)
      .filter((item) => item.phase === phase);

    const totalItems = filteredItems.length;
    const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

    const offset = (page - 1) * limit;

    return {
      success: true,

      range,

      filters: {
        phase,
        keyword,
        sort,
      },

      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
      },

      items: filteredItems.slice(offset, offset + limit),

      generatedAt: new Date().toISOString(),
    };
  }

  const offset = (page - 1) * limit;

  const [totalItems, rows] = await Promise.all([
    countCheckinDashboardTrips({
      from: range.from,
      to: range.to,
      keyword,
    }),

    findCheckinDashboardTrips({
      from: range.from,
      to: range.to,
      keyword,

      offset,
      limit,

      sort,
    }),
  ]);

  return {
    success: true,

    range,

    filters: {
      phase: null,
      keyword,
      sort,
    },

    pagination: {
      page,
      limit,
      totalItems,
      totalPages: totalItems === 0 ? 0 : Math.ceil(totalItems / limit),
    },

    items: rows.map(serializeTrip),

    generatedAt: new Date().toISOString(),
  };
}
