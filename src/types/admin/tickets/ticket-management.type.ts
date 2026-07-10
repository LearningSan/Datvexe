export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED";
export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";
export type HoldStatus = "NONE" | "HOLDING" | "EXPIRED";
export type CheckinStatus = "NOT_CHECKED_IN" | "PARTIAL" | "CHECKED_IN";

export type TicketWarning =
  | "HOLD_EXPIRING_SOON"
  | "HOLD_EXPIRED_NOT_CANCELLED"
  | "CONFIRMED_MISSING_SEAT"
  | "DUPLICATED_SEAT"
  | "CANCELLED_SEAT_NOT_RELEASED"
  | "REFUNDED_STATUS_NOT_UPDATED"
  | "DEPARTING_SOON_NOT_CHECKED_IN";

export interface AdminTicketListParams {
  keyword?: string;
  bookingCode?: string;
  customerName?: string;
  customerPhone?: string;
  routeId?: number;
  tripId?: number;
  departureDate?: string;
  bookingStatus?: BookingStatus;
  paymentStatus?: PaymentStatus;
  holdStatus?: HoldStatus;
  onlyHolding?: boolean;
  onlyNeedAction?: boolean;
  warning?: TicketWarning;
  page?: number;
  limit?: number;
}

export interface AdminTicketItem {
  bookingId: number;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  routeName: string;
  tripId: number;
  departureDatetime: string;
  seatNumbers: string | null;
  seatCount: number;
  totalAmount: number;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus | null;
  holdStatus: HoldStatus;
  holdExpiredAt: string | null;
  checkinStatus: CheckinStatus;
  needAction: boolean;
  warnings: TicketWarning[];
  createdAt: string;
}

export interface AdminTicketWarningSummary {
  holdExpiringSoon: number;
  holdExpiredNotCancelled: number;
  confirmedMissingSeats: number;
  duplicatedSeats: number;
  cancelledSeatNotReleased: number;
  refundedStatusNotUpdated: number;
  departingSoonNotCheckedIn: number;
}

export interface AdminTicketListResponse {
  items: AdminTicketItem[];
  total: number;
  page: number;
  limit: number;
  summary: AdminTicketWarningSummary;
}

export interface TicketOptionRoute {
  routeId: number;
  routeName: string;
}
export interface TicketOptionTrip {
  tripId: number;
  routeId: number;
  tripName: string;
  departureDatetime: string;

  vehicleTypeName: string | null;
  vehicleName: string | null;
  licensePlate: string | null;
  totalSeats: number | null;
}

export interface TicketOptionPickupPoint {
  pickupPointId: number;
  pointName: string;
  address: string | null;
}

export interface AdminTicketOptionsResponse {
  routes: TicketOptionRoute[];
  trips: TicketOptionTrip[];
  pickupPoints: TicketOptionPickupPoint[];
}

export interface AdminTicketSeat {
  bookingSeatId: number;
  seatLayoutDetailId: number;
  seatNumber: string;
  floorNo: number;
  rowNo: number;
  columnNo: number;
  seatPrice: number;
  checkinStatus: "NOT_CHECKED_IN" | "CHECKED_IN";
}

export interface AdminTicketHold {
  seatHoldId: number;
  seatLayoutDetailId: number;
  seatNumber: string;
  expiredAt: string;
  isExpired: boolean;
  remainingSeconds: number;
}

export interface AdminTicketPayment {
  paymentId: number;
  paymentMethod: string;
  amount: number;
  status: PaymentStatus;
  transactionCode: string | null;
  paidAt: string | null;
  createdAt: string;
}

export interface AdminTicketHistory {
  historyId: number;
  bookingId: number;
  actionType: string;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  performedByUserId: number | null;
  performedByName: string | null;
  createdAt: string;
}

export interface AdminTicketDetail {
  bookingId: number;
  bookingCode: string;
  bookingType: "ONLINE" | "OFFLINE";
  bookingStatus: BookingStatus;
  totalAmount: number;
  seatPrice: number;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  userId: number | null;
  customerType: "REGISTERED" | "GUEST" | "OFFLINE";
  tripId: number;
  routeName: string;
  originCityName: string;
  destinationCityName: string;
  departureDatetime: string;
  arrivalDatetime: string;
  vehicleName: string | null;
  licensePlate: string | null;
  driverNames: string | null;
  tripStatus: string;
  pickupPointId: number | null;
  pickupPointName: string | null;
  pickupAddress: string | null;
  dropoffPointId: number | null;
  dropoffPointName: string | null;
  dropoffAddress: string | null;
  holdExpiredAt: string | null;
  holdStatus: HoldStatus;
  paymentStatus: PaymentStatus | null;
  paymentMethod: string | null;
  paidAt: string | null;
  transactionCode: string | null;
  cancelReason: string | null;
  createdAt: string;
  seats: AdminTicketSeat[];
  holds: AdminTicketHold[];
  payments: AdminTicketPayment[];
  histories: AdminTicketHistory[];
}

export interface UpdateTicketStatusPayload {
  status: BookingStatus;
  reason?: string;
  markPaymentPaid?: boolean;
}

export interface CancelTicketPayload {
  reason: string;
  refundRequired?: boolean;
  notifyCustomer?: boolean;
}

export interface ExtendTicketHoldPayload {
  minutes: number;
}

export interface AddTicketSeatsPayload {
  seatLayoutDetailIds: number[];
}

export interface ChangeTicketSeatsPayload {
  oldBookingSeatIds: number[];
  newSeatLayoutDetailIds: number[];
}

export interface UpdatePickupDropoffPayload {
  pickupPointId?: number | null;
  dropoffPointId?: number | null;
}

export interface CreateOfflineTicketPayload {
  tripId: number;
  passengerName: string;
  passengerPhone: string;
  passengerEmail?: string | null;
  pickupPointId?: number | null;
  dropoffPointId?: number | null;
  seatLayoutDetailIds: number[];
  paid: boolean;
}

export interface CancelTicketPreview {
  canCancel: boolean;
  reasonRequired: boolean;
  bookingStatus: BookingStatus;
  paymentStatus: PaymentStatus | null;
  paidAmount: number;
  refundRequired: boolean;
  refundAmount: number;
  seatCount: number;
  seatsWillBeReleased: string[];
  holdsWillBeCancelled: number;
  warnings: string[];
}

export interface ChangeTicketPreviewParams {
  newTripId?: number;
  newSeatLayoutDetailIds?: number[];
  pickupPointId?: number | null;
  dropoffPointId?: number | null;
}

export interface ChangeTicketPreview {
  canChange: boolean;
  oldTripId: number;
  newTripId: number;
  oldSeatCount: number;
  newSeatCount: number;
  oldTotalAmount: number;
  newTotalAmount: number;
  priceDifference: number;
  needExtraPayment: boolean;
  needRefund: boolean;
  availableSeats: {
    seatLayoutDetailId: number;
    seatNumber: string;
    floorNo: number;
    rowNo: number;
    columnNo: number;
    seatStatus: "AVAILABLE" | "BOOKED" | "HOLDING";
  }[];
  warnings: string[];
  pickupPoints: {
    pickupPointId: number;
    pointName: string;
    address: string | null;
    pointCategory?: string | null;
    stopType?: "PICKUP" | "DROP_OFF" | "BOTH";
    stopOrder?: number;
    arrivalTime?: string | null;
    departureTime?: string | null;
  }[];

  dropoffPoints: {
    pickupPointId: number;
    pointName: string;
    address: string | null;
    pointCategory?: string | null;
    stopType?: "PICKUP" | "DROP_OFF" | "BOTH";
    stopOrder?: number;
    arrivalTime?: string | null;
    departureTime?: string | null;
  }[];
}

export interface ChangeTicketTripPayload {
  newTripId: number;
  oldBookingSeatIds: number[];
  newSeatLayoutDetailIds: number[];
  pickupPointId?: number | null;
  dropoffPointId?: number | null;
  reason?: string;
}
export interface AdminTicketPassengerItem {
  bookingId: number;
  bookingCode: string;
  passengerName: string;
  passengerPhone: string;
  seatNumbers: string | null;
  pickupPointName: string | null;
  dropoffPointName: string | null;
  checkinStatus: CheckinStatus;
}

export interface AdminTripSeatListItem {
  seatLayoutDetailId: number;
  seatNumber: string;
  floorNo: number;
  rowNo: number;
  columnNo: number;
  bookingId: number | null;
  bookingCode: string | null;
  passengerName: string | null;
  passengerPhone: string | null;
  seatStatus: "AVAILABLE" | "BOOKED" | "HOLDING";
}

export interface AdminTicketAvailableSeat {
  seatLayoutDetailId: number;
  seatNumber: string;
  floorNo: number;
  rowNo: number;
  columnNo: number;
  seatStatus: "AVAILABLE" | "BOOKED" | "HOLDING";
}

export interface ResendTicketResponse {
  bookingId: number;
  bookingCode: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  notificationCreated: boolean;
  notificationMessage: string;
  sentAt: string;
}
export type OfflineSeatStatus = "AVAILABLE" | "BOOKED" | "HOLDING";

export interface AdminOfflineTripSeat {
  seatLayoutDetailId: number;
  seatNumber: string;
  floorNo: number;
  rowNo: number;
  columnNo: number;
  seatStatus: OfflineSeatStatus;
}

export interface AdminOfflineTicketPreview {
  tripId: number;
  routeName: string;
  departureDatetime: string;
  ticketPrice: number;

  vehicleTypeName: string | null;
  vehicleName: string | null;
  licensePlate: string | null;
  totalSeats: number | null;

  availableSeats: AdminOfflineTripSeat[];
  pickupPoints: {
    pickupPointId: number;
    pointName: string;
    address: string | null;
    cityId?: number;
    cityName?: string;
    zoneId?: number;
    zoneName?: string;
    stopType?: "PICKUP" | "DROP_OFF" | "BOTH";
  }[];
  dropoffPoints: {
    pickupPointId: number;
    pointName: string;
    address: string | null;
    cityId?: number;
    cityName?: string;
    zoneId?: number;
    zoneName?: string;
    stopType?: "PICKUP" | "DROP_OFF" | "BOTH";
  }[];
}
