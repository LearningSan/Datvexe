export interface CurrentUser {
  userId: number;

  roleId: number;

  fullName: string;

  email: string | null;

  phone: string | null;

  avatarUrl: string | null;

  status: "ACTIVE" | "BLOCKED";
}
