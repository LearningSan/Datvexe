export type AdminStatus = "ACTIVE" | "BLOCKED";

export interface AdminUser {
  userId: number;
  roleId: number;
  roleName: string;

  fullName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  emailVerifiedAt: string | null;

  status: AdminStatus;
}

export interface AdminLoginPayload {
  email: string;
  password: string;
}

export interface AdminAuthData {
  accessToken: string;
  user: AdminUser;
}

export interface AdminAuthResponse {
  message: string;
  data: AdminAuthData;
}

export interface AdminLogoutResponse {
  message: string;
}

export interface CreateAdminSessionPayload {
  userId: number;
  refreshToken: string;
  userAgent: string | null;
  ipAddress: string | null;
  expiredAt: Date;
}
