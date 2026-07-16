export type WalletStatus = "ACTIVE" | "LOCKED";

export type WalletTransactionType =
  | "DEPOSIT"
  | "PAYMENT"
  | "REFUND"
  | "ADJUSTMENT";

export interface WalletTransactionItem {
  walletTransactionId: number;
  transactionType: WalletTransactionType;

  amount: number;
  balanceBefore: number;
  balanceAfter: number;

  referenceCode: string;
  description: string | null;

  paymentId: number | null;
  bookingId: number | null;
  bookingCode: string | null;

  createdAt: string;
}

export interface WalletSummaryResponse {
  walletId: number;
  userId: number;

  balance: number;
  availableBalance: number;

  status: WalletStatus;

  totalDeposited: number;
  totalPaid: number;
  totalRefunded: number;

  recentTransactions: WalletTransactionItem[];
}
export type WalletTopupStatus =
  | "PENDING"
  | "PROCESSING"
  | "SUCCESS"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";

export interface CreateWalletTopupPayload {
  amount: number;
}

export interface CreateWalletTopupResponse {
  topupId: number;
  transactionCode: string;
  amount: number;
  status: WalletTopupStatus;

  paymentUrl: string | null;
  qrCodeUrl: string | null;

  expiredAt: string;
}

export interface WalletTopupStatusResponse {
  topupId: number;
  status: WalletTopupStatus;
  amount: number;
  completedAt: string | null;
}

export interface WalletTransactionListResponse {
  items: WalletTransactionItem[];

  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
}
