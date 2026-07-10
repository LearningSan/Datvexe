import { query } from "@/lib/server/mysql";
import type { AuthUser } from "@/types/client/auth/auth.type";

interface UserRow {
  user_id: number;
  role_id: number;
  full_name: string;
  email: string | null;
  phone: string | null;
  password_hash: string | null;
  avatar_url: string | null;
  status: "ACTIVE" | "BLOCKED";
  email_verified_at: string | null;
}
function mapUser(row: UserRow): AuthUser {
  return {
    userId: row.user_id,
    roleId: row.role_id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    status: row.status,
    emailVerifiedAt: row.email_verified_at,
  };
}

export async function findUserByEmailOrPhone(identifier: string) {
  const rows = await query<UserRow>(
    `
    SELECT *
    FROM users
    WHERE email = ? OR phone = ?
    LIMIT 1
    `,
    [identifier, identifier],
  );

  return rows[0] ?? null;
}

export async function findAuthUserById(
  userId: number,
): Promise<AuthUser | null> {
  const rows = await query<UserRow>(
    `
    SELECT *
    FROM users
    WHERE user_id = ?
    LIMIT 1
    `,
    [userId],
  );

  return rows[0] ? mapUser(rows[0]) : null;
}

export async function createLocalUser(data: {
  fullName: string;
  email: string | null;
  phone: string | null;
  passwordHash: string;
}) {
  const customerRole = await query<{ role_id: number }>(
    `
    SELECT role_id
    FROM roles
    WHERE role_name = 'CUSTOMER'
    LIMIT 1
    `,
  );

  const roleId = customerRole[0]?.role_id ?? 1;

  const result: any = await query(
    `
    INSERT INTO users (
      role_id,
      full_name,
      email,
      phone,
      password_hash
    )
    VALUES (?, ?, ?, ?, ?)
    `,
    [roleId, data.fullName, data.email, data.phone, data.passwordHash],
  );

  return Number(result.insertId);
}
export async function createAuthSession(data: {
  userId: number;
  refreshToken: string;
  userAgent: string | null;
  ipAddress: string | null;
}) {
  const result: any = await query(
    `
    INSERT INTO auth_sessions (
      user_id,
      refresh_token,
      user_agent,
      ip_address,
      is_valid,
      expired_at
    )
    VALUES (?, ?, ?, ?, TRUE, NOW() + INTERVAL 7 DAY)
    `,
    [data.userId, data.refreshToken, data.userAgent, data.ipAddress],
  );

  return Number(result.insertId);
}

export async function updateSessionRefreshToken(data: {
  sessionId: number;
  refreshToken: string;
}) {
  await query(
    `
    UPDATE auth_sessions
    SET refresh_token = ?, expired_at = NOW() + INTERVAL 7 DAY
    WHERE session_id = ? AND is_valid = TRUE
    `,
    [data.refreshToken, data.sessionId],
  );
}

export async function findValidSession(
  sessionId: number,
  refreshToken: string,
) {
  const rows = await query<{ session_id: number; user_id: number }>(
    `
    SELECT session_id, user_id
    FROM auth_sessions
    WHERE session_id = ?
      AND refresh_token = ?
      AND is_valid = TRUE
      AND expired_at > NOW()
    LIMIT 1
    `,
    [sessionId, refreshToken],
  );

  return rows[0] ?? null;
}

export async function invalidateSession(sessionId: number) {
  await query(
    `
    UPDATE auth_sessions
    SET is_valid = FALSE
    WHERE session_id = ?
    `,
    [sessionId],
  );
}

export async function saveEmailVerifyToken(data: {
  userId: number;
  tokenHash: string;
}) {
  await query(
    `
    INSERT INTO email_verification_tokens (
      user_id,
      token_hash,
      expired_at
    )
    VALUES (?, ?, NOW() + INTERVAL 30 MINUTE)
    `,
    [data.userId, data.tokenHash],
  );
}

export async function verifyEmailToken(tokenHash: string) {
  const rows = await query<{ id: number; user_id: number }>(
    `
    SELECT id, user_id
    FROM email_verification_tokens
    WHERE token_hash = ?
      AND used_at IS NULL
      AND expired_at > NOW()
    LIMIT 1
    `,
    [tokenHash],
  );

  return rows[0] ?? null;
}

export async function markEmailVerified(data: {
  tokenId: number;
  userId: number;
}) {
  await query(
    `
    UPDATE users
    SET email_verified_at = NOW()
    WHERE user_id = ?
    `,
    [data.userId],
  );

  await query(
    `
    UPDATE email_verification_tokens
    SET used_at = NOW()
    WHERE id = ?
    `,
    [data.tokenId],
  );
}

export async function markPhoneVerified(phone: string) {
  await query(
    `
    UPDATE users
    SET phone_verified_at = NOW()
    WHERE phone = ?
    `,
    [phone],
  );
}
export async function createOAuthUser(data: {
  fullName: string;
  email: string | null;
  avatarUrl?: string | null;
  provider: "GOOGLE" | "FACEBOOK";
  providerId: string;
}) {
  const customerRole = await query<{ role_id: number }>(
    `
    SELECT role_id
    FROM roles
    WHERE role_name = 'CUSTOMER'
    LIMIT 1
    `,
  );

  const roleId = customerRole[0]?.role_id ?? 1;

  const userResult: any = await query(
    `
    INSERT INTO users (
      role_id,
      full_name,
      email,
      phone,
      password_hash,
      avatar_url,
      email_verified_at,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, NOW(), 'ACTIVE')
    `,
    [roleId, data.fullName, data.email, null, null, data.avatarUrl ?? null],
  );

  const userId = Number(userResult.insertId);

  await query(
    `
    INSERT INTO user_oauth_accounts (
      user_id,
      provider,
      provider_id
    )
    VALUES (?, ?, ?)
    `,
    [userId, data.provider, data.providerId],
  );

  return userId;
}
export async function findOAuthAccount(data: {
  provider: "GOOGLE" | "FACEBOOK";
  providerId: string;
}) {
  const rows = await query<UserRow>(
    `
    SELECT u.*
    FROM user_oauth_accounts oa
    JOIN users u ON u.user_id = oa.user_id
    WHERE oa.provider = ?
      AND oa.provider_id = ?
    LIMIT 1
    `,
    [data.provider, data.providerId],
  );

  return rows[0] ?? null;
}
export async function linkOAuthAccount(data: {
  userId: number;
  provider: "GOOGLE" | "FACEBOOK";
  providerId: string;
}) {
  await query(
    `
    INSERT INTO user_oauth_accounts (
      user_id,
      provider,
      provider_id
    )
    VALUES (?, ?, ?)
    `,
    [data.userId, data.provider, data.providerId],
  );
}
export async function mergeGuestBookingsByContact(data: {
  userId: number;
  email: string | null;
  phone: string | null;
}) {
  const result: any = await query(
    `
    UPDATE bookings
    SET user_id = ?
    WHERE user_id IS NULL
      AND (
        (? IS NOT NULL AND contact_email = ?)
        OR
        (? IS NOT NULL AND contact_phone = ?)
      )
    `,
    [
      data.userId,
      data.email,
      data.email,
      data.phone,
      data.phone,
    ],
  );

  return Number(result.affectedRows ?? 0);
}
export async function createMergeNotification(data: {
  userId: number;
  mergedCount: number;
}) {
  if (data.mergedCount <= 0) return;

  await query(
    `
    INSERT INTO notifications (
      user_id,
      title,
      content,
      notification_type
    )
    VALUES (?, ?, ?, 'BOOKING')
    `,
    [
      data.userId,
      "Đã liên kết vé vào tài khoản",
      `Hệ thống đã tự động liên kết ${data.mergedCount} vé đặt trước đó vào tài khoản của bạn.`,
    ],
  );
}