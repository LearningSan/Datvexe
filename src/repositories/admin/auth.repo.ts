import type { PoolConnection } from "@/lib/server/mysql";

import { connExecute, connQuery } from "@/lib/server/mysql";

import type {
  AdminStatus,
  CreateAdminSessionPayload,
} from "@/types/admin/auth/admin-auth.type";

export interface AdminAuthUserRow {
  userId: number;
  roleId: number;
  roleName: string;

  fullName: string;
  email: string | null;
  phone: string | null;
  passwordHash: string | null;
  avatarUrl: string | null;
  emailVerifiedAt: string | Date | null;

  status: AdminStatus;
}

export interface AdminAuthSessionRow {
  sessionId: number;
  userId: number;
  refreshToken: string;
  isValid: number;
  expiredAt: string | Date;
}

/**
 * Tìm tài khoản dùng cho đăng nhập admin.
 */
export async function findAdminUserByEmail(
  conn: PoolConnection,
  email: string,
): Promise<AdminAuthUserRow | null> {
  const rows = await connQuery<AdminAuthUserRow>(
    conn,
    `
      SELECT
        u.user_id AS userId,
        u.role_id AS roleId,
        r.role_name AS roleName,

        u.full_name AS fullName,
        u.email AS email,
        u.phone AS phone,
        u.password_hash AS passwordHash,
        u.avatar_url AS avatarUrl,
        u.email_verified_at AS emailVerifiedAt,
        u.status AS status
      FROM users u
      INNER JOIN roles r
        ON r.role_id = u.role_id
      WHERE LOWER(u.email) = LOWER(?)
      LIMIT 1
    `,
    [email],
  );

  return rows[0] ?? null;
}

/**
 * Tìm lại admin theo userId khi refresh phiên.
 */
export async function findAdminUserById(
  conn: PoolConnection,
  userId: number,
): Promise<AdminAuthUserRow | null> {
  const rows = await connQuery<AdminAuthUserRow>(
    conn,
    `
      SELECT
        u.user_id AS userId,
        u.role_id AS roleId,
        r.role_name AS roleName,

        u.full_name AS fullName,
        u.email AS email,
        u.phone AS phone,
        u.password_hash AS passwordHash,
        u.avatar_url AS avatarUrl,
        u.email_verified_at AS emailVerifiedAt,
        u.status AS status
      FROM users u
      INNER JOIN roles r
        ON r.role_id = u.role_id
      WHERE u.user_id = ?
      LIMIT 1
    `,
    [userId],
  );

  return rows[0] ?? null;
}

/**
 * Tạo auth session mới.
 *
 * refresh_token tạm được dùng vì JWT refresh cần sessionId,
 * trong khi auth_sessions.refresh_token đang NOT NULL.
 */
export async function createAdminSession(
  conn: PoolConnection,
  payload: CreateAdminSessionPayload,
): Promise<number> {
  const result = await connExecute(
    conn,
    `
      INSERT INTO auth_sessions (
        user_id,
        refresh_token,
        user_agent,
        ip_address,
        is_valid,
        expired_at
      )
      VALUES (?, ?, ?, ?, 1, ?)
    `,
    [
      payload.userId,
      payload.refreshToken,
      payload.userAgent,
      payload.ipAddress,
      payload.expiredAt,
    ],
  );

  return Number(result.insertId);
}

export async function findAdminSessionById(
  conn: PoolConnection,
  sessionId: number,
): Promise<AdminAuthSessionRow | null> {
  const rows = await connQuery<AdminAuthSessionRow>(
    conn,
    `
      SELECT
        session_id AS sessionId,
        user_id AS userId,
        refresh_token AS refreshToken,
        is_valid AS isValid,
        expired_at AS expiredAt
      FROM auth_sessions
      WHERE session_id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [sessionId],
  );

  return rows[0] ?? null;
}

export async function updateAdminSessionRefreshToken(
  conn: PoolConnection,
  sessionId: number,
  refreshToken: string,
  expiredAt: Date,
): Promise<void> {
  await connExecute(
    conn,
    `
      UPDATE auth_sessions
      SET
        refresh_token = ?,
        expired_at = ?,
        is_valid = 1
      WHERE session_id = ?
    `,
    [refreshToken, expiredAt, sessionId],
  );
}

export async function invalidateAdminSession(
  conn: PoolConnection,
  sessionId: number,
): Promise<void> {
  await connExecute(
    conn,
    `
      UPDATE auth_sessions
      SET is_valid = 0
      WHERE session_id = ?
    `,
    [sessionId],
  );
}
