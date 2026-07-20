import {
  findTripCheckinInfo,
  findTripCheckinPassengers,
  findUpcomingCheckinTrips,
} from "@/repositories/admin/checkin/checkin-query.repo";

import {
  canPassengerCheckin,
  getCheckinTimePhase,
  getPassengerAlert,
} from "./admin-checkin-time.service";

import type {
  CheckinPhase,
  PassengerAlertLevel,
  TripCheckinPassengerItem,
  TripCheckinPassengersResponse,
  TripCheckinSummary,
  TripPassengerFilter,
  UpcomingCheckinTripItem,
  UpcomingCheckinTripsResponse,
} from "@/types/admin/checkin/checkin-operation.type";

interface GetUpcomingTripsInput {
  hours: number;
  limit: number;
}

interface GetTripPassengersInput {
  tripId: number;
  filter?: TripPassengerFilter;
  keyword?: string;
}

export async function getUpcomingCheckinTrips(
  input: GetUpcomingTripsInput,
): Promise<UpcomingCheckinTripsResponse> {
  const rows = await findUpcomingCheckinTrips(input.hours, input.limit);

  const now = new Date();

  const trips: UpcomingCheckinTripItem[] = rows.map((row) => {
    const timeResult = getCheckinTimePhase({
      boardingTime: row.departureDatetime,
      now,
    });

    const notCheckedInCount = toNumber(row.notCheckedInCount);

    return {
      tripId: row.tripId,

      routeName: `${row.originName} → ${row.destinationName}`,

      departureDatetime: toIsoString(row.departureDatetime),

      vehicleName: row.vehicleName,

      licensePlate: row.licensePlate,

      tripStatus: row.tripStatus,

      checkinPhase: timeResult.phase,

      minutesUntilDeparture: timeResult.minutesUntilBoarding,

      totalSeats: toNumber(row.totalSeats),

      checkedInCount: toNumber(row.checkedInCount),

      notCheckedInCount,

      noShowCount: toNumber(row.noShowCount),

      rejectedCount: toNumber(row.rejectedCount),

      comingCount: toNumber(row.comingCount),

      arrivingLateCount: toNumber(row.arrivingLateCount),

      unreachableCount: toNumber(row.unreachableCount),

      criticalCount: isCriticalPhase(timeResult.phase) ? notCheckedInCount : 0,
    };
  });

  return {
    generatedAt: now.toISOString(),

    trips,
  };
}

export async function getTripCheckinPassengers(
  input: GetTripPassengersInput,
): Promise<TripCheckinPassengersResponse> {
  const trip = await findTripCheckinInfo(input.tripId);

  if (!trip) {
    throw new Error("Không tìm thấy chuyến xe");
  }

  const rows = await findTripCheckinPassengers(input.tripId);

  const now = new Date();

  const timeResult = getCheckinTimePhase({
    boardingTime: trip.departureDatetime,
    now,
  });

  const allPassengers: TripCheckinPassengerItem[] = rows.map((row) => {
    const alert = getPassengerAlert({
      checkinStatus: row.checkinStatus,

      contactStatus: row.contactStatus,

      boardingTime: trip.departureDatetime,

      expectedArrivalAt: row.expectedArrivalAt,

      now,
    });

    const checkinPermission = canPassengerCheckin({
      checkinStatus: row.checkinStatus,

      boardingTime: trip.departureDatetime,

      now,
    });

    return {
      bookingId: Number(row.bookingId),
      bookingSeatId: Number(row.bookingSeatId),

      bookingCode: row.bookingCode,
      tripId: Number(row.tripId),

      seatNumber: row.seatNumber,
      seatPrice: Number(row.seatPrice),

      passengerName: row.passengerName,
      passengerPhone: row.passengerPhone,
      passengerEmail: row.passengerEmail,

      pickupPointName: row.pickupPointName,
      pickupPointAddress: row.pickupPointAddress,

      checkinStatus: row.checkinStatus,

      checkedInAt: toNullableIsoString(row.checkedInAt),

      checkedInByName: row.checkedInByName,

      contactStatus: row.contactStatus ?? "NOT_CONTACTED",

      expectedArrivalAt: toNullableIsoString(row.expectedArrivalAt),

      lastContactedAt: toNullableIsoString(row.lastContactedAt),

      lastContactedByName: row.lastContactedByName,

      contactNote: row.contactNote,

      alertLevel: alert.level,
      alertLabel: alert.label,
      alertMessage: alert.message,
      alertPriority: alert.priority,

      requiresContact: alert.requiresContact,
      canCheckin: checkinPermission.allowed,

      canMarkNoShow:
        timeResult.canMarkNoShow && row.checkinStatus === "NOT_CHECKED_IN",
    };
  });

  /*
   * Ưu tiên khách nguy cấp lên trên.
   * Nếu cùng độ ưu tiên thì xếp theo mã ghế.
   */
  allPassengers.sort((first, second) => {
    if (first.alertPriority !== second.alertPriority) {
      return first.alertPriority - second.alertPriority;
    }

    return first.seatNumber.localeCompare(second.seatNumber, "vi", {
      numeric: true,
    });
  });

  const filteredPassengers = applyPassengerFilter(
    allPassengers,
    input.filter ?? "ALL",
    input.keyword ?? "",
  );

  const summary = buildTripSummary({
    tripId: trip.tripId,

    routeName: `${trip.originName} → ${trip.destinationName}`,

    departureDatetime: toIsoString(trip.departureDatetime),

    vehicleName: trip.vehicleName,

    licensePlate: trip.licensePlate,

    tripStatus: trip.tripStatus,

    checkinPhase: timeResult.phase,

    minutesUntilDeparture: timeResult.minutesUntilBoarding,

    passengers: allPassengers,
  });

  return {
    generatedAt: now.toISOString(),

    trip: summary,

    passengers: filteredPassengers,
  };
}

function buildTripSummary(input: {
  tripId: number;
  routeName: string;
  departureDatetime: string;

  vehicleName: string | null;
  licensePlate: string | null;

  tripStatus: string;
  checkinPhase: CheckinPhase;

  minutesUntilDeparture: number;

  passengers: TripCheckinPassengerItem[];
}): TripCheckinSummary {
  const passengers = input.passengers;

  const uniqueBookings = new Set(passengers.map((item) => item.bookingId));

  return {
    tripId: input.tripId,

    routeName: input.routeName,

    departureDatetime: input.departureDatetime,

    vehicleName: input.vehicleName,

    licensePlate: input.licensePlate,

    tripStatus: input.tripStatus,

    checkinPhase: input.checkinPhase,

    minutesUntilDeparture: input.minutesUntilDeparture,

    totalPassengers: uniqueBookings.size,

    totalSeats: passengers.length,

    checkedInCount: countByCheckinStatus(passengers, "CHECKED_IN"),

    notCheckedInCount: countByCheckinStatus(passengers, "NOT_CHECKED_IN"),

    noShowCount: countByCheckinStatus(passengers, "NO_SHOW"),

    rejectedCount: countByCheckinStatus(passengers, "REJECTED"),

    notContactedCount: countByContactStatus(passengers, "NOT_CONTACTED"),

    comingCount: countByContactStatus(passengers, "COMING"),

    arrivingLateCount: countByContactStatus(passengers, "ARRIVING_LATE"),

    unreachableCount: countByContactStatus(passengers, "UNREACHABLE"),

    cancelRequestedCount: countByContactStatus(passengers, "CANCEL_REQUESTED"),

    reminderCount: countByAlertLevel(passengers, "REMINDER"),

    warningCount: countByAlertLevel(passengers, "WARNING"),

    criticalCount: countByAlertLevel(passengers, "CRITICAL"),

    overdueCount: countByAlertLevel(passengers, "OVERDUE"),
  };
}

function applyPassengerFilter(
  passengers: TripCheckinPassengerItem[],
  filter: TripPassengerFilter,
  keyword: string,
): TripCheckinPassengerItem[] {
  const normalizedKeyword = normalizeKeyword(keyword);

  return passengers.filter((passenger) => {
    if (normalizedKeyword && !matchesKeyword(passenger, normalizedKeyword)) {
      return false;
    }

    switch (filter) {
      case "NOT_CHECKED_IN":
        return passenger.checkinStatus === "NOT_CHECKED_IN";

      case "CHECKED_IN":
        return passenger.checkinStatus === "CHECKED_IN";

      case "NO_SHOW":
        return passenger.checkinStatus === "NO_SHOW";

      case "REJECTED":
        return passenger.checkinStatus === "REJECTED";

      case "NEED_CONTACT":
        return (
          passenger.requiresContact &&
          passenger.checkinStatus === "NOT_CHECKED_IN"
        );

      case "COMING":
        return passenger.contactStatus === "COMING";

      case "ARRIVING_LATE":
        return passenger.contactStatus === "ARRIVING_LATE";

      case "UNREACHABLE":
        return passenger.contactStatus === "UNREACHABLE";

      case "CRITICAL":
        return (
          passenger.alertLevel === "CRITICAL" ||
          passenger.alertLevel === "OVERDUE"
        );

      default:
        return true;
    }
  });
}

function matchesKeyword(
  passenger: TripCheckinPassengerItem,
  keyword: string,
): boolean {
  const values = [
    passenger.bookingCode,
    passenger.seatNumber,
    passenger.passengerName,
    passenger.passengerPhone,
    passenger.passengerEmail ?? "",
    passenger.pickupPointName ?? "",
  ];

  return values.some((value) => normalizeKeyword(value).includes(keyword));
}

function normalizeKeyword(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function countByCheckinStatus(
  passengers: TripCheckinPassengerItem[],
  status: TripCheckinPassengerItem["checkinStatus"],
): number {
  return passengers.filter((item) => item.checkinStatus === status).length;
}

function countByContactStatus(
  passengers: TripCheckinPassengerItem[],
  status: TripCheckinPassengerItem["contactStatus"],
): number {
  /*
   * Một booking nhiều ghế chỉ tính một khách liên hệ.
   */
  const bookingIds = new Set<number>();

  passengers.forEach((item) => {
    if (
      item.contactStatus === status &&
      item.checkinStatus === "NOT_CHECKED_IN"
    ) {
      bookingIds.add(item.bookingId);
    }
  });

  return bookingIds.size;
}

function countByAlertLevel(
  passengers: TripCheckinPassengerItem[],
  level: PassengerAlertLevel,
): number {
  return passengers.filter(
    (item) =>
      item.alertLevel === level && item.checkinStatus === "NOT_CHECKED_IN",
  ).length;
}

function isCriticalPhase(phase: CheckinPhase): boolean {
  return phase === "CRITICAL" || phase === "GRACE" || phase === "CLOSED";
}

function toNumber(value: number | string | null | undefined): number {
  const result = Number(value ?? 0);

  return Number.isFinite(result) ? result : 0;
}

function toIsoString(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Dữ liệu thời gian không hợp lệ");
  }

  return date.toISOString();
}

function toNullableIsoString(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  return toIsoString(value);
}
