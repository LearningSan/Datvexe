import type {
  BookingStatus,
  PaymentMethodType,
  PaymentStatus,
} from "@/types/client/payment/payment.type";

export interface CancelTicketResponse {
  bookingId: number;
  bookingCode: string;

  bookingStatus: BookingStatus;

  originalAmount: number;
  cancelFee: number;
  refundAmount: number;

  refundMethod: "INTERNAL_WALLET" | "PAYMENT_GATEWAY" | "NONE";

  paymentId: number | null;

  message: string;
}

export interface ChangeTicketPreview {
  bookingId: number;
  bookingCode: string;

  oldTripId: number;
  oldDepartureDatetime: string;

  newTripId: number;
  newDepartureDatetime: string;

  seatCount: number;

  oldSeatNumbers: string[];
  newSeatNumbers: string[];

  oldTotalAmount: number;
  newTotalAmount: number;

  changeFee: number;

  differenceAmount: number;

  /**
   * > 0  : khách phải trả thêm
   * < 0  : khách được hoàn
   * = 0  : không chênh lệch
   */
  paymentRequired: boolean;
  refundRequired: boolean;

  paymentMethod: PaymentMethodType | null;
}

export interface ChangeTicketPayload {
  newTripId: number;
  newSeatLayoutDetailIds: number[];
}

export interface ChangeTicketConfirmPayload extends ChangeTicketPayload {
  previewToken?: string;
}

export interface ChangeTicketResponse {
  bookingId: number;
  bookingCode: string;

  oldTripId: number;
  newTripId: number;

  oldSeatNumbers: string[];
  newSeatNumbers: string[];

  oldTotalAmount: number;
  newTotalAmount: number;

  changeFee: number;
  differenceAmount: number;

  bookingStatus: BookingStatus;

  paymentId: number | null;

  message: string;
}
export interface CancelTicketPreview {
  bookingId: number;
  bookingCode: string;

  bookingStatus: BookingStatus;

  departureDatetime: string;
  hoursUntilDeparture: number;

  originalAmount: number;

  feePercent: number;
  cancelFee: number;
  refundAmount: number;

  refundMethod: "INTERNAL_WALLET" | "NONE";

  paymentId: number | null;

  relatedBookingCount: number;

  canCancel: boolean;

  message: string;
}
export interface BookingForAction {
  bookingId: number;
  bookingCode: string;

  userId: number | null;

  tripId: number;

  bookingStatus: "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED";

  totalAmount: number | string;

  contactName: string;
  contactPhone: string;
  contactEmail: string | null;

  paymentId: number | null;
  paymentStatus: string | null;
  paymentMethod: string | null;

  departureDatetime: string;
  tripStatus: string;

  seatCount: number;

  createdAt: string;
}

export interface BookingSeatRow {
  bookingSeatId: number;
  seatLayoutDetailId: number;
  seatNumber: string;
  seatPrice: number | string;
}

export interface TripForChange {
  tripId: number;
  routeId: number;
  vehicleId: number | null;

  departureDatetime: string;
  arrivalDatetime: string;

  availableSeats: number;
  ticketPrice: number | string;

  status: string;

  seatLayoutId: number | null;
}

export interface SeatAvailabilityRow {
  seatLayoutDetailId: number;
  seatNumber: string;
  seatPrice: number | string;
  tripId: number;
}

export interface WalletRow {
  walletId: number;
  userId: number;
  balance: number | string;
  status: "ACTIVE" | "LOCKED";
}
