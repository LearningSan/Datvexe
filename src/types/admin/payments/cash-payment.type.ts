import type {
  BookingStatus,
  PaymentStatus,
} from "@/types/client/payment/payment.type";

export interface AdminCashPaymentItem {
  paymentId: number;
  bookingId: number;

  bookingCode: string;
  transactionCode: string;

  customerName: string;
  customerPhone: string;
  customerEmail: string | null;

  routeName: string;
  departureDatetime: string | null;

  seatNumbers: string[];

  amount: number;

  paymentStatus: PaymentStatus;
  bookingStatus: BookingStatus;

  holdExpiredAt: string | null;
  createdAt: string;
  paidAt: string | null;
}

export interface AdminCashPaymentListParams {
  keyword?: string;

  status?:
    | "PENDING"
    | "WAITING_CONFIRM"
    | "PAID"
    | "EXPIRED";

  page?: number;
  limit?: number;
}

export interface AdminCashPaymentSummary {
  pendingCount: number;
  waitingCount: number;
  paidTodayCount: number;
  paidTodayAmount: number;
  expiredCount: number;
}

export interface AdminCashPaymentListResponse {
  items: AdminCashPaymentItem[];

  total: number;
  page: number;
  limit: number;

  summary: AdminCashPaymentSummary;
}

export interface LookupCashPaymentPayload {
  transactionCode: string;
}

export interface ConfirmCashPaymentPayload {
  transactionCode: string;
  note?: string;
}

export interface ConfirmCashPaymentResponse {
  success: true;
  bookingId: number;
  paymentId: number;
  alreadyProcessed: boolean;
}