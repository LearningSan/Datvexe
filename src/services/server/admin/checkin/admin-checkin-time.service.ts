import { CHECKIN_TIME_CONFIG } from "@/config/checkin.config";

import type {
  CheckinPhase,
  CheckinTimeConfiguration,
  CheckinTimeResult,
  PassengerAlertResult,
  PassengerContactStatus,
  CheckinStatus,
} from "@/types/admin/checkin/checkin-operation.type";

const MILLISECONDS_PER_MINUTE = 60 * 1000;

interface GetCheckinTimeInput {
  boardingTime: string | Date;
  now?: string | Date;
  config?: CheckinTimeConfiguration;
}

interface GetPassengerAlertInput {
  checkinStatus: CheckinStatus;
  contactStatus: PassengerContactStatus;

  boardingTime: string | Date;
  expectedArrivalAt?: string | Date | null;

  now?: string | Date;
  config?: CheckinTimeConfiguration;
}

export function getCheckinTimePhase(
  input: GetCheckinTimeInput,
): CheckinTimeResult {
  const config = input.config ?? CHECKIN_TIME_CONFIG;

  validateCheckinConfiguration(config);

  const boardingDate = toValidDate(
    input.boardingTime,
    "Thời gian lên xe không hợp lệ",
  );

  const nowDate = input.now
    ? toValidDate(input.now, "Thời gian hiện tại không hợp lệ")
    : new Date();

  const boardingTime = boardingDate.getTime();

  const currentTime = nowDate.getTime();

  const openAt =
    boardingTime - config.openBeforeMinutes * MILLISECONDS_PER_MINUTE;

  const reminderAt =
    boardingTime - config.reminderBeforeMinutes * MILLISECONDS_PER_MINUTE;

  const warningAt =
    boardingTime - config.warningBeforeMinutes * MILLISECONDS_PER_MINUTE;

  const criticalAt =
    boardingTime - config.criticalBeforeMinutes * MILLISECONDS_PER_MINUTE;

  const closeAt =
    boardingTime + config.graceAfterMinutes * MILLISECONDS_PER_MINUTE;

  const phase = determineCheckinPhase({
    currentTime,
    openAt,
    reminderAt,
    warningAt,
    criticalAt,
    boardingTime,
    closeAt,
  });

  const minutesUntilBoarding = calculateMinutesDifference(
    boardingTime,
    currentTime,
  );

  const minutesUntilOpen = calculateMinutesDifference(openAt, currentTime);

  const minutesUntilClose = calculateMinutesDifference(closeAt, currentTime);

  return {
    phase,

    boardingTime: boardingDate.toISOString(),

    openAt: new Date(openAt).toISOString(),

    reminderAt: new Date(reminderAt).toISOString(),

    warningAt: new Date(warningAt).toISOString(),

    criticalAt: new Date(criticalAt).toISOString(),

    closeAt: new Date(closeAt).toISOString(),

    minutesUntilBoarding,
    minutesUntilOpen,
    minutesUntilClose,

    hasOpened: currentTime >= openAt,

    hasDeparted: currentTime > boardingTime,

    hasClosed: currentTime > closeAt,

    canCheckinNormally:
      phase === "OPEN" ||
      phase === "REMINDER" ||
      phase === "WARNING" ||
      phase === "CRITICAL",

    requiresLateConfirmation: phase === "GRACE",

    canMarkNoShow: phase === "CLOSED",
  };
}

export function getPassengerAlert(
  input: GetPassengerAlertInput,
): PassengerAlertResult {
  if (input.checkinStatus === "CHECKED_IN") {
    return {
      level: "NORMAL",
      priority: 100,

      label: "Đã check-in",
      message: "Hành khách đã được xác nhận có mặt.",

      requiresContact: false,
      shouldMoveToTop: false,
    };
  }

  if (input.checkinStatus === "NO_SHOW") {
    return {
      level: "OVERDUE",
      priority: 90,

      label: "Vắng mặt",
      message: "Hành khách đã được đánh dấu không có mặt.",

      requiresContact: false,
      shouldMoveToTop: false,
    };
  }

  if (input.checkinStatus === "REJECTED") {
    return {
      level: "WARNING",
      priority: 80,

      label: "Bị từ chối",
      message: "Hành khách đã bị từ chối lên xe.",

      requiresContact: false,
      shouldMoveToTop: false,
    };
  }

  const timeResult = getCheckinTimePhase({
    boardingTime: input.boardingTime,

    now: input.now,

    config: input.config,
  });

  if (timeResult.phase === "CLOSED") {
    return {
      level: "OVERDUE",
      priority: 1,

      label: "Quá thời gian chờ",
      message: "Hành khách chưa check-in và đã quá thời gian chờ.",

      requiresContact: true,
      shouldMoveToTop: true,
    };
  }

  if (timeResult.phase === "GRACE") {
    return getGracePeriodAlert(
      input.contactStatus,
      input.expectedArrivalAt,
      input.now,
    );
  }

  if (timeResult.phase === "CRITICAL") {
    return getCriticalAlert(
      input.contactStatus,
      input.expectedArrivalAt,
      input.now,
    );
  }

  if (timeResult.phase === "WARNING") {
    return getWarningAlert(
      input.contactStatus,
      input.expectedArrivalAt,
      input.now,
    );
  }

  if (timeResult.phase === "REMINDER") {
    return {
      level: "REMINDER",
      priority: 40,

      label: "Cần nhắc khách",
      message: "Chuyến sắp khởi hành và hành khách chưa check-in.",

      requiresContact: input.contactStatus === "NOT_CONTACTED",

      shouldMoveToTop: false,
    };
  }

  return {
    level: "NORMAL",
    priority: 70,

    label:
      timeResult.phase === "NOT_OPEN" ? "Chưa mở check-in" : "Đang chờ khách",

    message:
      timeResult.phase === "NOT_OPEN"
        ? `Check-in sẽ mở sau ${Math.max(timeResult.minutesUntilOpen, 0)} phút.`
        : "Hành khách chưa check-in nhưng chưa cần cảnh báo.",

    requiresContact: false,
    shouldMoveToTop: false,
  };
}

export function canPassengerCheckin(input: {
  checkinStatus: CheckinStatus;
  boardingTime: string | Date;
  now?: string | Date;
  config?: CheckinTimeConfiguration;
}): {
  allowed: boolean;
  requiresConfirmation: boolean;
  reason: string;
} {
  if (input.checkinStatus === "CHECKED_IN") {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: "Ghế đã được check-in trước đó.",
    };
  }

  if (input.checkinStatus === "NO_SHOW") {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: "Ghế đã bị đánh dấu vắng mặt. Cần khôi phục trước khi check-in.",
    };
  }

  if (input.checkinStatus === "REJECTED") {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: "Ghế đã bị từ chối lên xe. Cần khôi phục trước khi check-in.",
    };
  }

  const timeResult = getCheckinTimePhase({
    boardingTime: input.boardingTime,

    now: input.now,

    config: input.config,
  });

  if (timeResult.phase === "NOT_OPEN") {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: `Chưa đến thời gian check-in. Check-in mở lúc ${formatTimeForMessage(
        timeResult.openAt,
      )}.`,
    };
  }

  if (timeResult.phase === "CLOSED") {
    return {
      allowed: false,
      requiresConfirmation: false,
      reason: "Đã quá thời gian check-in cho phép.",
    };
  }

  if (timeResult.phase === "GRACE") {
    return {
      allowed: true,
      requiresConfirmation: true,
      reason: "Khách đến sau giờ khởi hành nhưng vẫn còn trong thời gian chờ.",
    };
  }

  return {
    allowed: true,
    requiresConfirmation: false,
    reason: "Hành khách có thể check-in.",
  };
}

function determineCheckinPhase(input: {
  currentTime: number;

  openAt: number;
  reminderAt: number;
  warningAt: number;
  criticalAt: number;

  boardingTime: number;
  closeAt: number;
}): CheckinPhase {
  if (input.currentTime < input.openAt) {
    return "NOT_OPEN";
  }

  if (input.currentTime < input.reminderAt) {
    return "OPEN";
  }

  if (input.currentTime < input.warningAt) {
    return "REMINDER";
  }

  if (input.currentTime < input.criticalAt) {
    return "WARNING";
  }

  if (input.currentTime <= input.boardingTime) {
    return "CRITICAL";
  }

  if (input.currentTime <= input.closeAt) {
    return "GRACE";
  }

  return "CLOSED";
}

function getWarningAlert(
  contactStatus: PassengerContactStatus,
  expectedArrivalAt?: string | Date | null,
  now?: string | Date,
): PassengerAlertResult {
  if (contactStatus === "UNREACHABLE") {
    return {
      level: "WARNING",
      priority: 12,

      label: "Không liên lạc được",
      message: "Chuyến sắp khởi hành và chưa liên lạc được với khách.",

      requiresContact: true,
      shouldMoveToTop: true,
    };
  }

  if (contactStatus === "ARRIVING_LATE") {
    return {
      level: "WARNING",
      priority: 20,

      label: "Khách báo đến trễ",
      message: buildExpectedArrivalMessage(expectedArrivalAt, now),

      requiresContact: false,
      shouldMoveToTop: true,
    };
  }

  if (contactStatus === "COMING") {
    return {
      level: "WARNING",
      priority: 25,

      label: "Khách đang đến",
      message: "Khách đã xác nhận đang di chuyển tới điểm đón.",

      requiresContact: false,
      shouldMoveToTop: true,
    };
  }

  return {
    level: "WARNING",
    priority: 15,

    label: "Nên gọi khách",
    message: "Chuyến còn dưới 30 phút và hành khách chưa check-in.",

    requiresContact: true,
    shouldMoveToTop: true,
  };
}

function getCriticalAlert(
  contactStatus: PassengerContactStatus,
  expectedArrivalAt?: string | Date | null,
  now?: string | Date,
): PassengerAlertResult {
  if (contactStatus === "UNREACHABLE") {
    return {
      level: "CRITICAL",
      priority: 2,

      label: "Gọi lại ngay",
      message: "Chuyến còn dưới 15 phút và chưa liên lạc được với khách.",

      requiresContact: true,
      shouldMoveToTop: true,
    };
  }

  if (contactStatus === "ARRIVING_LATE") {
    return {
      level: "CRITICAL",
      priority: 5,

      label: "Khách sắp trễ",
      message: buildExpectedArrivalMessage(expectedArrivalAt, now),

      requiresContact: false,
      shouldMoveToTop: true,
    };
  }

  if (contactStatus === "COMING") {
    return {
      level: "CRITICAL",
      priority: 7,

      label: "Theo dõi khách đang đến",
      message: "Khách xác nhận đang đến nhưng chuyến sắp khởi hành.",

      requiresContact: false,
      shouldMoveToTop: true,
    };
  }

  if (contactStatus === "CANCEL_REQUESTED") {
    return {
      level: "CRITICAL",
      priority: 4,

      label: "Khách báo không đi",
      message: "Cần xử lý booking theo chính sách hủy vé.",

      requiresContact: false,
      shouldMoveToTop: true,
    };
  }

  return {
    level: "CRITICAL",
    priority: 3,

    label: "Cần gọi ngay",
    message: "Chuyến còn dưới 15 phút và hành khách chưa check-in.",

    requiresContact: true,
    shouldMoveToTop: true,
  };
}

function getGracePeriodAlert(
  contactStatus: PassengerContactStatus,
  expectedArrivalAt?: string | Date | null,
  now?: string | Date,
): PassengerAlertResult {
  if (contactStatus === "ARRIVING_LATE") {
    return {
      level: "OVERDUE",
      priority: 2,

      label: "Khách đến trễ",
      message: buildExpectedArrivalMessage(expectedArrivalAt, now),

      requiresContact: false,
      shouldMoveToTop: true,
    };
  }

  if (contactStatus === "COMING") {
    return {
      level: "OVERDUE",
      priority: 3,

      label: "Đang chờ khách",
      message: "Đã qua giờ khởi hành nhưng khách xác nhận đang đến.",

      requiresContact: true,
      shouldMoveToTop: true,
    };
  }

  if (contactStatus === "UNREACHABLE") {
    return {
      level: "OVERDUE",
      priority: 1,

      label: "Quá giờ, không liên lạc được",
      message: "Cần gọi lần cuối trước khi đánh dấu vắng mặt.",

      requiresContact: true,
      shouldMoveToTop: true,
    };
  }

  return {
    level: "OVERDUE",
    priority: 1,

    label: "Đã quá giờ khởi hành",
    message: "Khách chưa check-in. Cần liên hệ trước khi đóng check-in.",

    requiresContact: true,
    shouldMoveToTop: true,
  };
}

function buildExpectedArrivalMessage(
  expectedArrivalAt?: string | Date | null,
  now?: string | Date,
): string {
  if (!expectedArrivalAt) {
    return "Khách đã báo đến trễ nhưng chưa có thời gian dự kiến.";
  }

  const arrivalDate = toValidDate(
    expectedArrivalAt,
    "Thời gian khách dự kiến đến không hợp lệ",
  );

  const nowDate = now
    ? toValidDate(now, "Thời gian hiện tại không hợp lệ")
    : new Date();

  const remainingMinutes = calculateMinutesDifference(
    arrivalDate.getTime(),
    nowDate.getTime(),
  );

  if (remainingMinutes > 0) {
    return `Khách dự kiến đến sau khoảng ${remainingMinutes} phút.`;
  }

  if (remainingMinutes === 0) {
    return "Khách dự kiến đến trong vài phút tới.";
  }

  return `Khách đã trễ hơn thời gian dự kiến ${Math.abs(
    remainingMinutes,
  )} phút.`;
}

function validateCheckinConfiguration(config: CheckinTimeConfiguration) {
  const values = [
    config.openBeforeMinutes,
    config.reminderBeforeMinutes,
    config.warningBeforeMinutes,
    config.criticalBeforeMinutes,
    config.graceAfterMinutes,
  ];

  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("Cấu hình thời gian check-in không hợp lệ");
  }

  if (
    !(
      config.openBeforeMinutes >= config.reminderBeforeMinutes &&
      config.reminderBeforeMinutes >= config.warningBeforeMinutes &&
      config.warningBeforeMinutes >= config.criticalBeforeMinutes
    )
  ) {
    throw new Error("Các mốc thời gian check-in không đúng thứ tự");
  }
}

function toValidDate(value: string | Date, errorMessage: string): Date {
  const date =
    value instanceof Date ? new Date(value.getTime()) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error(errorMessage);
  }

  return date;
}

function calculateMinutesDifference(
  targetTime: number,
  currentTime: number,
): number {
  const difference = targetTime - currentTime;

  if (difference >= 0) {
    return Math.ceil(difference / MILLISECONDS_PER_MINUTE);
  }

  return Math.floor(difference / MILLISECONDS_PER_MINUTE);
}

function formatTimeForMessage(dateValue: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(dateValue));
}
