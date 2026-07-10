export type PaymentMethodType =
  | "PAYOS"
  | "VNPAY"
  | "MOMO"
  | "ZALOPAY"
  | "VIETQR"
  | "INTERNAL_WALLET"
  | "CASH";

export type PaymentStatus =
  | "PENDING"
  | "PROCESSING"
  | "WAITING_CONFIRM"
  | "PAID"
  | "FAILED"
  | "REJECTED"
  | "EXPIRED"
  | "REFUNDED";

export type PaymentFlowType =
  | "REDIRECT"
  | "QR"
  | "IFRAME"
  | "CASH"
  | "INTERNAL";

export type PaymentUiMode =
  | "QR"
  | "IFRAME"
  | "REDIRECT"
  | "WALLET"
  | "CASH"
  | "WAITING";

export type BookingStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "REFUNDED";

export type PaymentGatewayStatus = "SUCCESS" | "FAILED";

export type ManualPaymentType =
  | "VIETQR"
  | "CASH"
  | "INTERNAL_WALLET"
  | "GATEWAY";
export interface ManualPaymentInfo {
  type: "VIETQR" | "CASH" | "INTERNAL_WALLET";
  title: string;
  receiverName?: string;
  receiverPhone?: string;
  bankName?: string;
  bankAccountNo?: string;
  bankAccountName?: string;
  transferContent: string;
  instruction: string;
  walletBalance?: number;
  walletBalanceAfterPayment?: number;
  missingAmount?: number;
}

export type ActiveSeatHold = {
  bookingId: number | null;
  tripId: number;
  sessionId: string;
};

export interface BookingPaymentSummary {
  bookingId: number;
  bookingCode: string;
  tripId: number;
  routeName: string;
  vehicleTypeName: string;
  departureDatetime: string;
  arrivalDatetime: string;
  passengerName: string;
  passengerPhone: string;
  passengerEmail: string | null;
  seatCount: number;
  seatNumbers: string[];
  pickupPointName: string | null;
  pickupPointAddress: string | null;
  dropoffPointName: string | null;
  dropoffPointAddress: string | null;
  ticketPrice: number;
  discountAmount: number;
  subtotalAmount: number;
  totalAmount: number;
  holdExpiredAt: string;
  bookingStatus: BookingStatus;
  paymentMethod: PaymentMethodType | null;
  paymentStatus: PaymentStatus | null;
  transactionCode: string | null;
  paidAt: string | null;
  vehicleName: string | null;
  licensePlate: string | null;
  tripStatus: string | null;
  tripTicketPrice: number | null;
  bookingType: "ONLINE" | "OFFLINE";
  pickupMethod: "OFFICE" | "SHUTTLE";
  dropoffMethod: "OFFICE" | "SHUTTLE";
  createdAt: string;
  cancelReason: string | null;
}

export interface BookingPaymentSummaryRow extends Omit<
  BookingPaymentSummary,
  | "routeName"
  | "departureDatetime"
  | "arrivalDatetime"
  | "ticketPrice"
  | "tripTicketPrice"
  | "discountAmount"
  | "subtotalAmount"
  | "totalAmount"
  | "createdAt"
  | "paidAt"
  | "seatNumbers"
> {
  originCity: string;
  destinationCity: string;
  departureDatetime: string | null;
  arrivalDatetime: string | null;
  seatPrice: string | number;
  tripTicketPrice: string | number | null;
  discountAmount: string | number | null;
  totalAmount: string | number;
  createdAt: string;
  paidAt: string | null;
  seatNumbersRaw: string | null;
}

export interface CreatePaymentPayload {
  bookingId: number;
  paymentMethod: PaymentMethodType;
  sessionId: string;
}
export interface CreatePaymentResponse {
  paymentId: number;
  bookingId: number;
  bookingCode: string;
  transactionCode: string;
  paymentMethod: PaymentMethodType;
  amount: number;
  status: PaymentStatus;
  flowType: PaymentFlowType;
  uiMode: PaymentUiMode;
  actionText: string | null;
  qrCodeUrl: string | null;
  paymentUrl: string | null;
  deeplink: string | null;
  returnUrl: string | null;
  cancelUrl: string | null;
  manualInfo: ManualPaymentInfo | null;
  expiredAt: string;
}

export interface PaymentStatusResponse {
  paymentId: number;
  bookingId: number;
  status: PaymentStatus;
}

export interface CancelHoldPayload extends ActiveSeatHold {}

export interface UpdatePaymentMethodPayload {
  paymentId: number;
  bookingId: number;
  paymentMethod: PaymentMethodType;
  sessionId: string;
}

export interface PaymentWebhookPayload {
  transactionCode: string;
  status: PaymentGatewayStatus;
  amount: number;
  gatewayTransactionId?: string;
  gatewayResponse?: unknown;
}

export interface BuiltPaymentData {
  qrCodeUrl: string | null;
  paymentUrl: string | null;
  deeplink: string | null;
  returnUrl: string | null;
  cancelUrl: string | null;
  uiMode: PaymentUiMode;
  actionText: string | null;
  manualInfo: ManualPaymentInfo | null;
}