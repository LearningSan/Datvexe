import type {
  CheckinPhase,
  PassengerAlertLevel,
  PassengerContactStatus,
  CheckinStatus,
} from "@/types/admin/checkin/checkin-operation.type";

type PassengerAlertInput = {
  departureDatetime: string | Date;
  checkinStatus: CheckinStatus;
  contactStatus?: PassengerContactStatus | null;
  expectedArrivalAt?: string | Date | null;
};

export type PassengerAlertResult = {
  level: PassengerAlertLevel;
  message: string;
  minutesUntilDeparture: number;
};

/**
 * Quy tắc thời gian check-in:
 *
 * > 120 phút                 => NOT_OPEN
 * 61 - 120 phút              => OPEN
 * 31 - 60 phút               => REMINDER
 * 16 - 30 phút               => WARNING
 * 1 - 15 phút                => CRITICAL
 * 0 đến -30 phút             => GRACE
 * < -30 phút                 => CLOSED
 */
export function getCheckinTimePhase(
  departureDatetime: string | Date,
  now: Date = new Date(),
): CheckinPhase {
  const departure = parseDate(departureDatetime);

  if (!departure) {
    return "CLOSED";
  }

  const minutesUntilDeparture = getMinutesDifference(departure, now);

  if (minutesUntilDeparture > 120) {
    return "NOT_OPEN";
  }

  if (minutesUntilDeparture > 60) {
    return "OPEN";
  }

  if (minutesUntilDeparture > 30) {
    return "REMINDER";
  }

  if (minutesUntilDeparture > 15) {
    return "WARNING";
  }

  if (minutesUntilDeparture > 0) {
    return "CRITICAL";
  }

  if (minutesUntilDeparture >= -30) {
    return "GRACE";
  }

  return "CLOSED";
}

/**
 * Xác định mức cảnh báo của hành khách.
 *
 * Ưu tiên:
 *
 * 1. Đã check-in thì NORMAL
 * 2. NO_SHOW hoặc quá grace period thì OVERDUE
 * 3. REJECTED thì CRITICAL
 * 4. Không liên lạc được gần giờ chạy thì CRITICAL
 * 5. Đến trễ thì WARNING/CRITICAL tùy thời gian dự kiến
 * 6. Chưa check-in thì cảnh báo theo phase
 */
export function getPassengerAlert(
  input: PassengerAlertInput,
  now: Date = new Date(),
): PassengerAlertResult {
  const departure = parseDate(input.departureDatetime);

  if (!departure) {
    return {
      level: "OVERDUE",
      message: "Thời gian khởi hành không hợp lệ",
      minutesUntilDeparture: 0,
    };
  }

  const minutesUntilDeparture = getMinutesDifference(departure, now);

  if (input.checkinStatus === "CHECKED_IN") {
    return {
      level: "NORMAL",
      message: "Hành khách đã check-in",
      minutesUntilDeparture,
    };
  }

  if (input.checkinStatus === "NO_SHOW") {
    return {
      level: "OVERDUE",
      message: "Hành khách đã được ghi nhận vắng mặt",
      minutesUntilDeparture,
    };
  }

  if (input.checkinStatus === "REJECTED") {
    return {
      level: "CRITICAL",
      message: "Hành khách bị từ chối lên xe",
      minutesUntilDeparture,
    };
  }

  if (minutesUntilDeparture < -30) {
    return {
      level: "OVERDUE",
      message: "Đã quá thời gian gia hạn check-in",
      minutesUntilDeparture,
    };
  }

  if (input.contactStatus === "CANCEL_REQUESTED") {
    return {
      level: "CRITICAL",
      message: "Hành khách yêu cầu hủy vé",
      minutesUntilDeparture,
    };
  }

  if (input.contactStatus === "UNREACHABLE") {
    if (minutesUntilDeparture <= 30) {
      return {
        level: "CRITICAL",
        message: "Không liên lạc được với hành khách và chuyến sắp khởi hành",
        minutesUntilDeparture,
      };
    }

    return {
      level: "WARNING",
      message: "Không liên lạc được với hành khách",
      minutesUntilDeparture,
    };
  }

  if (input.contactStatus === "ARRIVING_LATE") {
    return getArrivingLateAlert({
      expectedArrivalAt: input.expectedArrivalAt,
      departure,
      minutesUntilDeparture,
      now,
    });
  }

  const phase = getCheckinTimePhase(input.departureDatetime, now);

  switch (phase) {
    case "NOT_OPEN":
    case "OPEN":
      return {
        level: "NORMAL",
        message: "Chưa cần cảnh báo check-in",
        minutesUntilDeparture,
      };

    case "REMINDER":
      return {
        level: "REMINDER",
        message: "Nên nhắc hành khách check-in",
        minutesUntilDeparture,
      };

    case "WARNING":
      return {
        level: "WARNING",
        message: "Hành khách chưa check-in, chuyến sắp khởi hành",
        minutesUntilDeparture,
      };

    case "CRITICAL":
      return {
        level: "CRITICAL",
        message: "Hành khách chưa check-in, sắp hết thời gian",
        minutesUntilDeparture,
      };

    case "GRACE":
      return {
        level: "CRITICAL",
        message: "Chuyến đã khởi hành và đang trong thời gian gia hạn",
        minutesUntilDeparture,
      };

    case "CLOSED":
      return {
        level: "OVERDUE",
        message: "Đã quá thời gian gia hạn check-in",
        minutesUntilDeparture,
      };
  }
}

function getArrivingLateAlert(input: {
  expectedArrivalAt?: string | Date | null;
  departure: Date;
  minutesUntilDeparture: number;
  now: Date;
}): PassengerAlertResult {
  const expectedArrival = parseDate(input.expectedArrivalAt);

  if (!expectedArrival) {
    return {
      level: input.minutesUntilDeparture <= 15 ? "CRITICAL" : "WARNING",

      message: "Hành khách báo đến trễ nhưng chưa có thời gian dự kiến",

      minutesUntilDeparture: input.minutesUntilDeparture,
    };
  }

  const minutesUntilExpectedArrival = getMinutesDifference(
    expectedArrival,
    input.now,
  );

  const expectedMinutesBeforeDeparture = getMinutesDifference(
    input.departure,
    expectedArrival,
  );

  if (expectedMinutesBeforeDeparture < -30) {
    return {
      level: "OVERDUE",
      message: "Thời gian dự kiến đến đã quá thời gian gia hạn check-in",
      minutesUntilDeparture: input.minutesUntilDeparture,
    };
  }

  if (expectedMinutesBeforeDeparture < 0) {
    return {
      level: "CRITICAL",
      message: "Hành khách dự kiến đến sau giờ khởi hành",
      minutesUntilDeparture: input.minutesUntilDeparture,
    };
  }

  if (minutesUntilExpectedArrival < 0) {
    return {
      level: "CRITICAL",
      message: "Đã quá thời gian hành khách dự kiến đến",
      minutesUntilDeparture: input.minutesUntilDeparture,
    };
  }

  if (
    input.minutesUntilDeparture <= 15 ||
    expectedMinutesBeforeDeparture <= 5
  ) {
    return {
      level: "CRITICAL",
      message: "Hành khách đến trễ và thời gian còn lại rất ít",
      minutesUntilDeparture: input.minutesUntilDeparture,
    };
  }

  return {
    level: "WARNING",
    message: "Hành khách đã báo sẽ đến trễ",
    minutesUntilDeparture: input.minutesUntilDeparture,
  };
}

function parseDate(value: string | Date | null | undefined): Date | null {
  if (value == null) {
    return null;
  }

  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  return date;
}

function getMinutesDifference(future: Date, base: Date): number {
  return Math.floor((future.getTime() - base.getTime()) / 60_000);
}
