export type AuthProvider = "LOCAL" | "GOOGLE" | "FACEBOOK";

export interface AuthUser {
  userId: number;
  roleId: number;
  fullName: string;
  email: string | null;
  phone: string | null;
  avatarUrl: string | null;
  status: "ACTIVE" | "BLOCKED";

  provider?: AuthProvider;

  emailVerifiedAt: string | null;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}