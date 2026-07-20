export type ContactStatus =
  | "NOT_CONTACTED"
  | "NOTIFIED"
  | "CONTACTED"
  | "COMING"
  | "ARRIVING_LATE"
  | "UNREACHABLE"
  | "CANCEL_REQUESTED";

export type CheckinStatus =
  | "NOT_CHECKED_IN"
  | "CHECKED_IN"
  | "NO_SHOW"
  | "REJECTED";

export type PassengerContactStatus =
  | "NOT_CONTACTED"
  | "NOTIFIED"
  | "CONTACTED"
  | "COMING"
  | "ARRIVING_LATE"
  | "UNREACHABLE"
  | "CANCEL_REQUESTED";

export type PassengerContactType =
  | "PHONE_CALL"
  | "IN_APP_NOTIFICATION"
  | "EMAIL"
  | "MANUAL";

export type PassengerContactResult =
  | "CONTACTED"
  | "COMING"
  | "ARRIVING_LATE"
  | "UNREACHABLE"
  | "CANCEL_REQUESTED";

export type CheckinPhase =
  | "NOT_OPEN"
  | "OPEN"
  | "REMINDER"
  | "WARNING"
  | "CRITICAL"
  | "GRACE"
  | "CLOSED";

export type PassengerAlertLevel =
  | "NORMAL"
  | "REMINDER"
  | "WARNING"
  | "CRITICAL"
  | "OVERDUE";



export type CheckinLogAction =
  | "CHECK_IN"
  | "UNDO_CHECK_IN"
  | "MARK_NO_SHOW"
  | "BULK_MARK_NO_SHOW"
  | "REJECT_BOARDING"
  | "RESTORE";

export interface CheckinTimeConfiguration {
  openBeforeMinutes: number;
  reminderBeforeMinutes: number;
  warningBeforeMinutes: number;
  criticalBeforeMinutes: number;
  graceAfterMinutes: number;
}

export interface CheckinTimeResult {
  phase: CheckinPhase;

  boardingTime: string;
  openAt: string;
  reminderAt: string;
  warningAt: string;
  criticalAt: string;
  closeAt: string;

  minutesUntilBoarding: number;
  minutesUntilOpen: number;
  minutesUntilClose: number;

  hasOpened: boolean;
  hasDeparted: boolean;
  hasClosed: boolean;

  canCheckinNormally: boolean;
  requiresLateConfirmation: boolean;
  canMarkNoShow: boolean;
}

export interface PassengerAlertResult {
  level: PassengerAlertLevel;
  priority: number;

  label: string;
  message: string;

  requiresContact: boolean;
  shouldMoveToTop: boolean;
}

export interface UpcomingCheckinTripItem {
  tripId: number;

  routeName: string;
  departureDatetime: string;

  vehicleName: string | null;
  licensePlate: string | null;

  tripStatus: string;
  checkinPhase: CheckinPhase;

  minutesUntilDeparture: number;

  totalSeats: number;
  checkedInCount: number;
  notCheckedInCount: number;
  noShowCount: number;
  rejectedCount: number;

  comingCount: number;
  arrivingLateCount: number;
  unreachableCount: number;
  criticalCount: number;
}

export interface TripCheckinPassengerItem {
  bookingId: number;
  bookingSeatId: number;

  bookingCode: string;
  tripId: number;

  seatNumber: string;
  seatPrice: number;

  passengerName: string;
  passengerPhone: string;
  passengerEmail: string | null;

  pickupPointName: string | null;
  pickupPointAddress: string | null;

  checkinStatus: CheckinStatus;

  checkedInAt: string | null;
  checkedInByName: string | null;

  contactStatus: PassengerContactStatus;

  expectedArrivalAt: string | null;
  lastContactedAt: string | null;
  lastContactedByName: string | null;

  contactNote: string | null;

  alertLevel: PassengerAlertLevel;
  alertLabel: string;
  alertMessage: string;
  alertPriority: number;

  requiresContact: boolean;
  canCheckin: boolean;
  canMarkNoShow: boolean;
}
export interface UpcomingCheckinTripsResponse {
  generatedAt: string;
  trips: UpcomingCheckinTripItem[];
}

export interface TripCheckinSummary {
  tripId: number;

  routeName: string;
  departureDatetime: string;

  vehicleName: string | null;
  licensePlate: string | null;

  tripStatus: string;
  checkinPhase: CheckinPhase;

  minutesUntilDeparture: number;

  totalPassengers: number;
  totalSeats: number;

  checkedInCount: number;
  notCheckedInCount: number;
  noShowCount: number;
  rejectedCount: number;

  notContactedCount: number;
  comingCount: number;
  arrivingLateCount: number;
  unreachableCount: number;
  cancelRequestedCount: number;

  reminderCount: number;
  warningCount: number;
  criticalCount: number;
  overdueCount: number;
}

export interface TripCheckinPassengersResponse {
  generatedAt: string;
  trip: TripCheckinSummary;
  passengers: TripCheckinPassengerItem[];
}

export type TripPassengerFilter =
  | "ALL"
  | "NOT_CHECKED_IN"
  | "CHECKED_IN"
  | "NO_SHOW"
  | "REJECTED"
  | "NEED_CONTACT"
  | "COMING"
  | "ARRIVING_LATE"
  | "UNREACHABLE"
  | "CRITICAL";


export interface UpdatePassengerContactPayload {
  bookingId: number;
  tripId: number;

  contactType: PassengerContactType;
  contactResult: PassengerContactResult;

  expectedArrivalAt?: string | null;
  note?: string | null;
}

export interface UpdatePassengerContactResponse {
  success: true;

  bookingId: number;
  tripId: number;

  previousStatus: PassengerContactStatus;
  contactStatus: PassengerContactStatus;

  expectedArrivalAt: string | null;
  lastContactedAt: string;
  lastContactedBy: number;
  lastContactedByName: string | null;

  contactNote: string | null;
}

export interface PassengerContactLogItem {
  contactLogId: number;

  bookingId: number;
  tripId: number;

  contactType: PassengerContactType;

  previousStatus: PassengerContactStatus;
  newStatus: PassengerContactStatus;

  expectedArrivalAt: string | null;
  note: string | null;

  contactedBy: number | null;
  contactedByName: string | null;

  contactedAt: string;
}

export interface PassengerContactHistoryResponse {
  bookingId: number;
  tripId: number;

  logs: PassengerContactLogItem[];
}

 



