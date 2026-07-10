export interface AccountProfile {
  userId: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  avatarPublicId: string | null;
}

export interface UpdateAccountProfilePayload {
  fullName: string;
  phone: string | null;
  avatarUrl?: string | null;
  avatarPublicId?: string | null;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}

export interface TicketHistoryItem {
  bookingId: number;
  bookingCode: string;
  status: string;
  totalAmount: number;
  contactName: string;
  contactPhone: string;
  departureDateTime: string;
  paymentStatus: string | null;
  createdAt: string;
  paymentMethod: string | null;
  transactionCode: string | null;
  paidAt: string | null;
}
