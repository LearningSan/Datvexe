import bcrypt from "bcryptjs";
import crypto from "crypto";

import {
  createAuthSession,
  createLocalUser,
  findAuthUserById,
  findUserByEmailOrPhone,
  findValidSession,
  invalidateSession,
  markEmailVerified,
  saveEmailVerifyToken,
  updateSessionRefreshToken,
  verifyEmailToken,
  createOAuthUser,
  findOAuthAccount,
  linkOAuthAccount,
  mergeGuestBookingsByContact,
  createMergeNotification,
} from "@/repositories/client/auth.repo";

import {
  createAccessToken,
  createRefreshToken,
  verifyRefreshToken,
} from "@/lib/server/jwt";

import { sendRegisterOtpEmail } from "@/lib/server/mail";

export async function registerLocal(data: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}) {
  const email = data.email.trim().toLowerCase();
  const phone = data.phone.trim();

  const existed = await findUserByEmailOrPhone(email);
  if (existed) throw new Error("EMAIL_ALREADY_EXISTS");

  const existedPhone = await findUserByEmailOrPhone(phone);
  if (existedPhone) throw new Error("PHONE_ALREADY_EXISTS");

  const passwordHash = await bcrypt.hash(data.password, 10);

  const userId = await createLocalUser({
    fullName: data.fullName.trim(),
    email,
    phone,
    passwordHash,
  });

  const otp = crypto.randomInt(100000, 999999).toString();
  const tokenHash = crypto.createHash("sha256").update(otp).digest("hex");

  await saveEmailVerifyToken({
    userId,
    tokenHash,
  });

  await sendRegisterOtpEmail(email, otp);

  const user = await findAuthUserById(userId);
  if (!user) throw new Error("USER_NOT_FOUND");

  return user;
}

export async function loginLocal(data: {
  identifier: string;
  password: string;
  userAgent: string | null;
  ipAddress: string | null;
}) {
  const rawUser = await findUserByEmailOrPhone(data.identifier);

  if (!rawUser || !rawUser.password_hash) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const isPasswordValid = await bcrypt.compare(
    data.password,
    rawUser.password_hash,
  );

  if (!isPasswordValid) {
    throw new Error("INVALID_CREDENTIALS");
  }

  if (rawUser.status !== "ACTIVE") {
    throw new Error("USER_BLOCKED");
  }

  return await createLoginSession({
    userId: rawUser.user_id,
    roleId: rawUser.role_id,
    userAgent: data.userAgent,
    ipAddress: data.ipAddress,
  });
}

export async function refreshAuth(refreshToken: string) {
  const payload = await verifyRefreshToken(refreshToken);

  const session = await findValidSession(payload.sessionId, refreshToken);
  if (!session) throw new Error("SESSION_INVALID");

  const user = await findAuthUserById(payload.userId);
  if (!user) throw new Error("USER_NOT_FOUND");

  const newRefreshToken = await createRefreshToken({
    userId: user.userId,
    sessionId: payload.sessionId,
  });

  await updateSessionRefreshToken({
    sessionId: payload.sessionId,
    refreshToken: newRefreshToken,
  });

  const accessToken = await createAccessToken({
    userId: user.userId,
    roleId: user.roleId,
    sessionId: payload.sessionId,
  });

  return {
    accessToken,
    refreshToken: newRefreshToken,
    user,
  };
}

export async function logoutAuth(refreshToken: string | null) {
  if (!refreshToken) return;

  try {
    const payload = await verifyRefreshToken(refreshToken);
    await invalidateSession(payload.sessionId);
  } catch {
    return;
  }
}

export async function verifyEmail(rawToken: string) {
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

  const token = await verifyEmailToken(tokenHash);
  if (!token) throw new Error("TOKEN_INVALID_OR_EXPIRED");

  await markEmailVerified({
    tokenId: token.id,
    userId: token.user_id,
  });
}

async function createLoginSession(data: {
  userId: number;
  roleId: number;
  userAgent: string | null;
  ipAddress: string | null;
}) {
  const fakeRefresh = crypto.randomUUID();

  const sessionId = await createAuthSession({
    userId: data.userId,
    refreshToken: fakeRefresh,
    userAgent: data.userAgent,
    ipAddress: data.ipAddress,
  });

  const refreshToken = await createRefreshToken({
    userId: data.userId,
    sessionId,
  });

  await updateSessionRefreshToken({
    sessionId,
    refreshToken,
  });

  const accessToken = await createAccessToken({
    userId: data.userId,
    roleId: data.roleId,
    sessionId,
  });

  const user = await findAuthUserById(data.userId);
  if (!user) throw new Error("USER_NOT_FOUND");
  const mergedCount = await mergeGuestBookingsByContact({
    userId: user.userId,
    email: user.email,
    phone: user.phone,
  });

  await createMergeNotification({
    userId: user.userId,
    mergedCount,
  });
  return {
    accessToken,
    refreshToken,
    user,
  };
}

export async function loginOAuth(data: {
  provider: "GOOGLE" | "FACEBOOK";
  providerId: string;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
  userAgent: string | null;
  ipAddress: string | null;
}) {
  let rawUser = await findOAuthAccount({
    provider: data.provider,
    providerId: data.providerId,
  });

  let userId: number;
  let roleId: number;

  if (!rawUser) {
    if (data.email) {
      rawUser = await findUserByEmailOrPhone(data.email);
    }

    if (rawUser) {
      if (rawUser.status !== "ACTIVE") {
        throw new Error("USER_BLOCKED");
      }

      userId = rawUser.user_id;
      roleId = rawUser.role_id;

      await linkOAuthAccount({
        userId,
        provider: data.provider,
        providerId: data.providerId,
      });
    } else {
      userId = await createOAuthUser({
        fullName: data.fullName,
        email: data.email,
        avatarUrl: data.avatarUrl,
        provider: data.provider,
        providerId: data.providerId,
      });

      const createdUser = await findAuthUserById(userId);
      if (!createdUser) throw new Error("USER_NOT_FOUND");

      roleId = createdUser.roleId;
    }
  } else {
    if (rawUser.status !== "ACTIVE") {
      throw new Error("USER_BLOCKED");
    }

    userId = rawUser.user_id;
    roleId = rawUser.role_id;
  }

  return await createLoginSession({
    userId,
    roleId,
    userAgent: data.userAgent,
    ipAddress: data.ipAddress,
  });
}
async function mergeGuestBookingsToUser(data: {
  userId: number;
  email: string | null;
  phone: string | null;
}) {
  if (!data.email && !data.phone) return;

  await mergeGuestBookingsByContact({
    userId: data.userId,
    email: data.email,
    phone: data.phone,
  });
}
