import bcrypt from "bcryptjs";

import { findUserById } from "@/repositories/client/user.repo";

import { CurrentUser } from "@/types/client/user/current-user.type";

import {
  findUserProfileById,
  updateUserProfileById,
  findUserPasswordHash,
  updateUserPasswordHash,
  findTicketHistoryByUserId,
} from "@/repositories/client/user.repo";
import type {
  UpdateAccountProfilePayload,
  ChangePasswordPayload,
} from "@/types/client/user/account.type";

export async function getAccountProfile(userId: number) {
  const user = await findUserProfileById(userId);

  if (!user) {
    throw new Error("USER_NOT_FOUND");
  }

  return user;
}

export async function updateAccountProfile(
  userId: number,
  payload: UpdateAccountProfilePayload,
) {
  if (!payload.fullName?.trim()) {
    throw new Error("FULL_NAME_REQUIRED");
  }

return await updateUserProfileById(userId, {
  fullName: payload.fullName.trim(),
  phone: payload.phone?.trim() || null,
  avatarUrl: payload.avatarUrl ?? null,
  avatarPublicId: payload.avatarPublicId ?? null,
});
}

export async function changeAccountPassword(
  userId: number,
  payload: ChangePasswordPayload,
) {
  if (!payload.currentPassword || !payload.newPassword) {
    throw new Error("PASSWORD_REQUIRED");
  }

  if (payload.newPassword.length < 8) {
    throw new Error("PASSWORD_TOO_SHORT");
  }

  const user = await findUserPasswordHash(userId);

  if (!user || !user.passwordHash) {
    throw new Error("LOCAL_PASSWORD_NOT_FOUND");
  }

  const isMatch = await bcrypt.compare(
    payload.currentPassword,
    user.passwordHash,
  );

  if (!isMatch) {
    throw new Error("CURRENT_PASSWORD_WRONG");
  }

  const newHash = await bcrypt.hash(payload.newPassword, 10);

  await updateUserPasswordHash(userId, newHash);

  return { success: true };
}

export async function getTicketHistory(userId: number) {
  return await findTicketHistoryByUserId(userId);
}
export async function getCurrentUser(
  userId: number,
): Promise<CurrentUser | null> {
  if (!userId) {
    return null;
  }

  const user = await findUserById(userId);

  return user;
}
