import {
  findAdminUsers,
  findAdminUserDetail,
  findAdminGuestDetail,
  createAdminUserRepo,
  updateAdminUserRepo,
  updateAdminUserStatusRepo,
  resetAdminUserPasswordRepo,
} from "@/repositories/admin/user.repo";
import type { AdminUserListParams } from "@/types/admin/users/user-management.type";
import bcrypt from "bcryptjs";

export async function getAdminUsers(params: AdminUserListParams) {
  return await findAdminUsers(params);
}

export async function createAdminUser(data: {
  fullName: string;
  email?: string | null;
  phone?: string | null;
  password: string;
}) {
  const passwordHash = await bcrypt.hash(data.password, 10);

  return await createAdminUserRepo({
    fullName: data.fullName,
    email: data.email,
    phone: data.phone,
    passwordHash,
  });
}

export async function updateAdminUser(
  userId: number,
  data: {
    fullName: string;
    email?: string | null;
    phone?: string | null;
  },
) {
  return await updateAdminUserRepo(userId, data);
}

export async function updateAdminUserStatus(
  userId: number,
  status: "ACTIVE" | "BLOCKED",
) {
  return await updateAdminUserStatusRepo(userId, status);
}
export async function getAdminUserDetail(userId: number) {
  const data = await findAdminUserDetail(userId);

  if (!data) {
    throw new Error("Không tìm thấy khách hàng");
  }

  return data;
}
export async function getAdminGuestDetail(data: {
  email?: string | null;
  phone?: string | null;
}) {
  if (!data.email && !data.phone) {
    throw new Error("Thiếu email hoặc số điện thoại khách vãng lai");
  }

  return await findAdminGuestDetail(data);
}

export async function resetAdminUserPassword(
  userId: number,
  newPassword: string,
) {
  if (!newPassword || newPassword.length < 6) {
    throw new Error("Mật khẩu mới phải có ít nhất 6 ký tự");
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  return await resetAdminUserPasswordRepo(userId, passwordHash);
}