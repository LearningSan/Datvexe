import bcrypt from "bcryptjs";
import crypto from "crypto";
import {
  createAdminAccessToken,
  createAdminRefreshToken,
  verifyAdminRefreshToken,
  generateAdminTokenId,
} from "@/lib/server/admin-jwt";

import { withTransaction } from "@/lib/server/mysql";

import {
  createAdminSession,
  findAdminSessionById,
  findAdminUserByEmail,
  findAdminUserById,
  invalidateAdminSession,
  updateAdminSessionRefreshToken,
  type AdminAuthUserRow,
} from "@/repositories/admin/auth.repo";

import type {
  AdminAuthData,
  AdminLoginPayload,
  AdminUser,
} from "@/types/admin/auth/admin-auth.type";

import {
  adminSessionExpiredError,
  blockedAdminError,
  forbiddenAdminError,
  invalidAdminCredentialsError,
  unauthorizedAdminError,
} from "./admin-auth-error";

interface AdminLoginMetadata {
  userAgent: string | null;
  ipAddress: string | null;
}

interface AdminAuthResult {
  refreshToken: string;
  data: AdminAuthData;
}

const REFRESH_TOKEN_DURATION_DAYS = 7;
function hashRefreshToken(refreshToken: string): string {
  return crypto.createHash("sha256").update(refreshToken).digest("hex");
}
function createRefreshExpiredAt() {
  const expiredAt = new Date();

  expiredAt.setDate(expiredAt.getDate() + REFRESH_TOKEN_DURATION_DAYS);

  return expiredAt;
}

function isAdminRole(roleName: string) {
  return roleName.trim().toUpperCase() === "ADMIN";
}

function serializeAdminUser(row: AdminAuthUserRow): AdminUser {
  return {
    userId: row.userId,
    roleId: row.roleId,
    roleName: row.roleName,

    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    avatarUrl: row.avatarUrl,

    emailVerifiedAt:
      row.emailVerifiedAt instanceof Date
        ? row.emailVerifiedAt.toISOString()
        : row.emailVerifiedAt,

    status: row.status,
  };
}

function validateAdminUser(row: AdminAuthUserRow) {
  if (row.status !== "ACTIVE") {
    throw blockedAdminError();
  }

  if (!isAdminRole(row.roleName)) {
    throw forbiddenAdminError();
  }
}

/**
 * Đăng nhập admin.
 */
export async function loginAdmin(
  payload: AdminLoginPayload,
  metadata: AdminLoginMetadata,
): Promise<AdminAuthResult> {
  return await withTransaction(async (conn) => {
    const email = payload.email.trim().toLowerCase();

    const user = await findAdminUserByEmail(conn, email);

    if (!user?.passwordHash) {
      throw invalidAdminCredentialsError();
    }

    validateAdminUser(user);

    const passwordMatched = await bcrypt.compare(
      payload.password,
      user.passwordHash,
    );

    if (!passwordMatched) {
      throw invalidAdminCredentialsError();
    }

    const expiredAt = createRefreshExpiredAt();

    const temporaryToken = generateAdminTokenId();

    const sessionId = await createAdminSession(conn, {
      userId: user.userId,
      refreshToken: temporaryToken,
      userAgent: metadata.userAgent,
      ipAddress: metadata.ipAddress,
      expiredAt,
    });

    const [accessToken, refreshToken] = await Promise.all([
      createAdminAccessToken({
        userId: user.userId,
        roleId: user.roleId,
        sessionId,
      }),

      createAdminRefreshToken({
        userId: user.userId,
        sessionId,
      }),
    ]);

    await updateAdminSessionRefreshToken(
      conn,
      sessionId,
      hashRefreshToken(refreshToken),
      expiredAt,
    );

    return {
      refreshToken,

      data: {
        accessToken,
        user: serializeAdminUser(user),
      },
    };
  });
}

/**
 * Khôi phục hoặc làm mới phiên admin.
 *
 * Có rotation refresh token:
 * refresh token cũ sẽ bị thay thế sau mỗi lần refresh.
 */
export async function refreshAdminSession(
  refreshToken: string,
): Promise<AdminAuthResult> {
  let payload: Awaited<ReturnType<typeof verifyAdminRefreshToken>>;

  try {
    payload = await verifyAdminRefreshToken(refreshToken);
  } catch {
    throw unauthorizedAdminError();
  }

  const userId = Number(payload.userId);
  const sessionId = Number(payload.sessionId);

  if (
    !Number.isInteger(userId) ||
    userId <= 0 ||
    !Number.isInteger(sessionId) ||
    sessionId <= 0
  ) {
    throw unauthorizedAdminError();
  }

  return await withTransaction(async (conn) => {
    const session = await findAdminSessionById(conn, sessionId);

    if (!session || session.userId !== userId || session.isValid !== 1) {
      throw unauthorizedAdminError();
    }

    /*
     * Chống sử dụng lại refresh token cũ sau rotation.
     */
    if (session.refreshToken !== hashRefreshToken(refreshToken)) {
      await invalidateAdminSession(conn, sessionId);

      throw unauthorizedAdminError();
    }

    const expiredAt = new Date(session.expiredAt);

    if (
      Number.isNaN(expiredAt.getTime()) ||
      expiredAt.getTime() <= Date.now()
    ) {
      await invalidateAdminSession(conn, sessionId);

      throw adminSessionExpiredError();
    }

    const user = await findAdminUserById(conn, userId);

    if (!user) {
      await invalidateAdminSession(conn, sessionId);

      throw unauthorizedAdminError();
    }

    validateAdminUser(user);

    const nextExpiredAt = createRefreshExpiredAt();

    const [accessToken, nextRefreshToken] = await Promise.all([
      createAdminAccessToken({
        userId: user.userId,
        roleId: user.roleId,
        sessionId,
      }),

      createAdminRefreshToken({
        userId: user.userId,
        sessionId,
      }),
    ]);

    await updateAdminSessionRefreshToken(
      conn,
      sessionId,
      hashRefreshToken(nextRefreshToken),
      nextExpiredAt,
    );

    return {
      refreshToken: nextRefreshToken,

      data: {
        accessToken,
        user: serializeAdminUser(user),
      },
    };
  });
}

/**
 * Đăng xuất phiên admin hiện tại.
 */
export async function logoutAdminSession(
  refreshToken: string | null,
): Promise<void> {
  if (!refreshToken) {
    return;
  }

  try {
    const payload = await verifyAdminRefreshToken(refreshToken);

    const sessionId = Number(payload.sessionId);

    if (!Number.isInteger(sessionId) || sessionId <= 0) {
      return;
    }

    await withTransaction(async (conn) => {
      await invalidateAdminSession(conn, sessionId);
    });
  } catch {
    /*
     * Cookie hỏng hoặc hết hạn vẫn cho phép logout.
     * Route sẽ luôn xóa cookie phía trình duyệt.
     */
  }
}
