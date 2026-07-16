export type AdminWalletStatus = "ACTIVE" | "LOCKED";

export interface AdminWalletItem {
  walletId: number;
  userId: number;

  fullName: string;
  email: string;
  phone: string | null;

  balance: number;
  status: AdminWalletStatus;

  totalDeposited: number;
  totalPaid: number;
  totalRefunded: number;

  transactionCount: number;

  createdAt: string;
  updatedAt: string;
}

export interface AdminWalletListParams {
  keyword?: string;
  status?: AdminWalletStatus;

  page?: number;
  limit?: number;
}

export interface AdminWalletListSummary {
  totalWallets: number;
  activeWallets: number;
  lockedWallets: number;

  totalBalance: number;
  totalDeposited: number;
  totalPaid: number;
}

export interface AdminWalletListResponse {
  items: AdminWalletItem[];

  total: number;
  page: number;
  limit: number;

  summary: AdminWalletListSummary;
}

export interface UpdateAdminWalletStatusPayload {
  status: AdminWalletStatus;
  reason?: string;
}

export interface AdjustAdminWalletPayload {
  adjustmentType: "INCREASE" | "DECREASE";

  amount: number;
  reason: string;
}
