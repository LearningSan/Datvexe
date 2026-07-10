export type AdminUserStatus = "ACTIVE" | "BLOCKED";

export interface AdminUserItem {
  userId: number | null;
  customerType: "REGISTERED" | "GUEST";
  fullName: string;
  email: string | null;
  phone: string | null;
  roleName: string;
  status: "ACTIVE" | "BLOCKED";
  bookingCount: number;
  lastLoginAt: string;
  createdAt: string;
  avatarUrl: string | null;
}

export interface AdminUserListParams {
  keyword?: string;
  status?: AdminUserStatus;
  page?: number;
  limit?: number;
}

export interface AdminUserListResponse {
  items: AdminUserItem[];
  total: number;
  page: number;
  limit: number;
}
export interface AdminUserDetail {
  userId: number | null;
  customerType: "REGISTERED" | "GUEST";
  fullName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  roleName: string;
  status: "ACTIVE" | "BLOCKED";
  emailVerifiedAt: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  lastLoginAt: string | null;
  bookingCount: number;
  totalSpent: number;
  loginMethods: string[];
  bookings: any[];
}
