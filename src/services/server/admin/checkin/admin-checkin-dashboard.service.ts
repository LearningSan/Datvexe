import {
  findCheckinDashboardContactSummary,
  findCheckinDashboardSeatSummary,
  findCheckinDashboardTrips,
  type DashboardTripRawRow,
} from "@/repositories/admin/checkin/checkin-dashboard.repo";

import {
  getCheckinTimePhase,
  getPassengerAlert,
} from "@/lib/server/checkin/checkin-status.helper";

import type {
  CheckinDashboardAlertStats,
  CheckinDashboardSummaryResponse,
  CheckinDashboardTripItem,
  CheckinDashboardTripsResponse,
  CheckinDashboardTripStats,
} from "@/types/admin/checkin/checkin-dashboard.type";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function getCheckinDashboardSummary(input?: {
  from?: string;
  to?: string;
}): Promise<CheckinDashboardSummaryResponse> {
  const range = resolveDateRange(input);

  const [seatRow, contactRow, rawTrips] = await Promise.all([
    findCheckinDashboardSeatSummary(range),
    findCheckinDashboardContactSummary(range),
    findCheckinDashboardTrips({
      ...range,
      limit: MAX_LIMIT,
    }),
  ]);

  const totalSeats = toNumber(seatRow?.totalSeats);
  const checkedIn = toNumber(seatRow?.checkedIn);
  const noShow = toNumber(seatRow?.noShow);

  const trips = rawTrips.map(mapDashboardTrip);

  return {
    success: true,

    range,

    seats: {
      totalSeats,

      notCheckedIn: toNumber(seatRow?.notCheckedIn),

      checkedIn,
      noShow,

      rejected: toNumber(seatRow?.rejected),

      checkinRate: calculateRate(checkedIn, totalSeats),

      noShowRate: calculateRate(noShow, totalSeats),
    },

    trips: buildTripStats(trips),

    contacts: {
      notContacted: toNumber(contactRow?.notContacted),

      contacted: toNumber(contactRow?.contacted),

      coming: toNumber(contactRow?.coming),

      arrivingLate: toNumber(contactRow?.arrivingLate),

      unreachable: toNumber(contactRow?.unreachable),

      cancelRequested: toNumber(contactRow?.cancelRequested),
    },

    alerts: buildAlertStats(trips),

    generatedAt: new Date().toISOString(),
  };
}

export async function getCheckinDashboardTrips(input?: {
  from?: string;
  to?: string;
  limit?: number;
}): Promise<CheckinDashboardTripsResponse> {
  const range = resolveDateRange(input);
  const limit = normalizeLimit(input?.limit);

  const rows = await findCheckinDashboardTrips({
    ...range,
    limit,
  });

  const items = rows.map(mapDashboardTrip);

  return {
    success: true,
    total: items.length,
    items,
  };
}

function mapDashboardTrip(row: DashboardTripRawRow): CheckinDashboardTripItem {
  const totalSeats = toNumber(row.totalSeats);
  const checkedInSeats = toNumber(row.checkedInSeats);

  const departureDatetime = new Date(row.departureDatetime).toISOString();

  const checkinPhase = getCheckinTimePhase(departureDatetime);

  const alert = getPassengerAlert({
    departureDatetime,
    checkinStatus:
      toNumber(row.notCheckedInSeats) > 0 ? "NOT_CHECKED_IN" : "CHECKED_IN",

    contactStatus:
      toNumber(row.unreachableBookings) > 0
        ? "UNREACHABLE"
        : toNumber(row.arrivingLateBookings) > 0
          ? "ARRIVING_LATE"
          : "NOT_CONTACTED",
  });

  return {
    tripId: toNumber(row.tripId),

    routeName: `${row.originName} → ${row.destinationName}`,

    departureDatetime,

    tripStatus: row.tripStatus,

    checkinPhase,

    alertLevel: alert.level,

    totalSeats,
    checkedInSeats,

    notCheckedInSeats: toNumber(row.notCheckedInSeats),

    noShowSeats: toNumber(row.noShowSeats),

    rejectedSeats: toNumber(row.rejectedSeats),

    checkinRate: calculateRate(checkedInSeats, totalSeats),

    totalBookings: toNumber(row.totalBookings),

    contactedBookings: toNumber(row.contactedBookings),

    arrivingLateBookings: toNumber(row.arrivingLateBookings),

    unreachableBookings: toNumber(row.unreachableBookings),
  };
}

function buildTripStats(
  trips: CheckinDashboardTripItem[],
): CheckinDashboardTripStats {
  const result: CheckinDashboardTripStats = {
    totalTrips: trips.length,

    notOpen: 0,
    open: 0,
    reminder: 0,
    warning: 0,
    critical: 0,
    grace: 0,
    closed: 0,
  };

  for (const trip of trips) {
    switch (trip.checkinPhase) {
      case "NOT_OPEN":
        result.notOpen += 1;
        break;

      case "OPEN":
        result.open += 1;
        break;

      case "REMINDER":
        result.reminder += 1;
        break;

      case "WARNING":
        result.warning += 1;
        break;

      case "CRITICAL":
        result.critical += 1;
        break;

      case "GRACE":
        result.grace += 1;
        break;

      case "CLOSED":
        result.closed += 1;
        break;
    }
  }

  return result;
}

function buildAlertStats(
  trips: CheckinDashboardTripItem[],
): CheckinDashboardAlertStats {
  const result: CheckinDashboardAlertStats = {
    normal: 0,
    reminder: 0,
    warning: 0,
    critical: 0,
    overdue: 0,
  };

  for (const trip of trips) {
    switch (trip.alertLevel) {
      case "NORMAL":
        result.normal += 1;
        break;

      case "REMINDER":
        result.reminder += 1;
        break;

      case "WARNING":
        result.warning += 1;
        break;

      case "CRITICAL":
        result.critical += 1;
        break;

      case "OVERDUE":
        result.overdue += 1;
        break;
    }
  }

  return result;
}

function resolveDateRange(input?: { from?: string; to?: string }): {
  from: string;
  to: string;
} {
  const now = new Date();

  const defaultFrom = new Date(now);
  defaultFrom.setHours(0, 0, 0, 0);

  const defaultTo = new Date(defaultFrom);
  defaultTo.setDate(defaultTo.getDate() + 1);

  const from = parseDate(input?.from) ?? defaultFrom;
  const to = parseDate(input?.to) ?? defaultTo;

  if (to.getTime() <= from.getTime()) {
    throw new Error("Thời gian kết thúc phải lớn hơn thời gian bắt đầu");
  }

  return {
    from: formatMysqlDateTime(from),
    to: formatMysqlDateTime(to),
  };
}

function parseDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);

  if (!Number.isFinite(parsed.getTime())) {
    return null;
  }

  return parsed;
}

function formatMysqlDateTime(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, "0");

  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    " ",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
    ":",
    pad(date.getSeconds()),
  ].join("");
}

function calculateRate(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Number(((value / total) * 100).toFixed(2));
}

function normalizeLimit(value?: number): number {
  if (value == null || !Number.isInteger(value) || value <= 0) {
    return DEFAULT_LIMIT;
  }

  return Math.min(value, MAX_LIMIT);
}

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);

  return Number.isFinite(parsed) ? parsed : 0;
}
