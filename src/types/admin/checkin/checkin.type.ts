

export type ContactStatus =
  | "NOT_CONTACTED"
  | "NOTIFIED"
  | "CONTACTED"
  | "COMING"
  | "ARRIVING_LATE"
  | "UNREACHABLE"
  | "CANCEL_REQUESTED";

export type PassengerAlertLevel =
  | "NORMAL"
  | "REMINDER"
  | "WARNING"
  | "CRITICAL"
  | "OVERDUE";

export type CheckinStatus =
  | "NOT_CHECKED_IN"
  | "CHECKED_IN"
  | "NO_SHOW"
  | "REJECTED";

export type CheckinEligibility =
  | "ELIGIBLE"
  | "ALREADY_CHECKED_IN"
  | "UNPAID"
  | "BOOKING_CANCELLED"
  | "BOOKING_REFUNDED"
  | "WRONG_TRIP"
  | "TRIP_CANCELLED"
  | "TRIP_COMPLETED"
  | "TOO_EARLY"
  | "TOO_LATE";

export interface AdminCheckinSeatItem {
  bookingSeatId: number;
  seatLayoutDetailId: number;
  seatNumber: string;
  seatPrice: number;

  checkinStatus: CheckinStatus;
  checkedInAt: string | null;
  checkedInBy: number | null;
  checkedInByName: string | null;
  checkinNote: string | null;

  canCheckin: boolean;
}

export interface AdminCheckinLookupResponse {
  bookingId: number;
  bookingCode: string;
  tripId: number;

  passengerName: string;
  passengerPhone: string;
  passengerEmail: string | null;

  routeName: string;
  departureDatetime: string;
  arrivalDatetime: string | null;

  pickupPointName: string | null;
  pickupPointAddress: string | null;

  dropoffPointName: string | null;
  dropoffPointAddress: string | null;

  vehicleName: string | null;
  licensePlate: string | null;

  bookingStatus: "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED";
  paymentStatus:
    | "PENDING"
    | "PROCESSING"
    | "WAITING_CONFIRM"
    | "PAID"
    | "FAILED"
    | "REJECTED"
    | "EXPIRED"
    | "REFUNDED"
    | null;

  tripStatus: string;

  eligibility: CheckinEligibility;
  eligibilityMessage: string;

  totalSeats: number;
  checkedInSeats: number;
  remainingSeats: number;

  seats: AdminCheckinSeatItem[];
}

export interface LookupCheckinQrPayload {
  qrData: string;
  expectedTripId?: number;
}

export interface ConfirmCheckinPayload {
  bookingId: number;
  bookingSeatIds: number[];
  note?: string;
}

export interface ConfirmCheckinResponse {
  success: true;
  bookingId: number;

  checkedInSeatIds: number[];
  alreadyCheckedInSeatIds: number[];

  checkedInCount: number;
  alreadyCheckedInCount: number;
}
