import { query } from "@/lib/server/mysql";

import { CurrentUser } from "@/types/client/user/current-user.type";
import type {
  AccountProfile,
  TicketHistoryItem,
} from "@/types/client/user/account.type";
export async function findUserById(
  userId: number,
): Promise<CurrentUser | null> {
  const sql = `
        SELECT
            u.user_id AS userId,
            u.role_id AS roleId,
            u.full_name AS fullName,
            u.email AS email,
            u.phone AS phone,
            u.avatar_url AS avatarUrl,
            u.status AS status
        FROM users u
        WHERE u.user_id = ?
        LIMIT 1
    `;
  const result = await query<CurrentUser>(sql, [userId]);
  return result[0] || null;
}
export async function findUserProfileById(userId: number) {
  const sql = `
    SELECT
      user_id AS userId,
      full_name AS fullName,
      email,
      phone,
      avatar_url AS avatarUrl,
       avatar_public_id AS avatarPublicId
    FROM users
    WHERE user_id = ?
    LIMIT 1
  `;

  const rows = await query<AccountProfile>(sql, [userId]);
  return rows[0] || null;
}

export async function updateUserProfileById(
  userId: number,
  payload: {
    fullName: string;
    phone: string | null;
    avatarUrl?: string | null;
    avatarPublicId?: string | null;
  },
) {
  const sql = `
    UPDATE users
    SET
      full_name = ?,
      phone = ?,
      avatar_url = ?,
      avatar_public_id = ?
    WHERE user_id = ?
  `;

  await query(sql, [
    payload.fullName,
    payload.phone,
    payload.avatarUrl ?? null,
    payload.avatarPublicId ?? null,
    userId,
  ]);

  return findUserProfileById(userId);
}

export async function findUserPasswordHash(userId: number) {
  const sql = `
    SELECT password_hash AS passwordHash
    FROM users
    WHERE user_id = ?
    LIMIT 1
  `;

  const rows = await query<{ passwordHash: string | null }>(sql, [userId]);
  return rows[0] || null;
}

export async function updateUserPasswordHash(
  userId: number,
  passwordHash: string,
) {
  const sql = `
    UPDATE users
    SET password_hash = ?
    WHERE user_id = ?
  `;

  await query(sql, [passwordHash, userId]);
}

export async function findTicketHistoryByUserId(userId: number) {
  const sql = `
    SELECT
      b.booking_id AS bookingId,
      b.booking_code AS bookingCode,
      b.status,
      b.total_amount AS totalAmount,
      b.contact_name AS contactName,
      b.contact_phone AS contactPhone,
      t.departure_datetime AS departureDateTime,
      p.status AS paymentStatus,
      p.payment_method AS paymentMethod,
      p.transaction_code AS transactionCode,
      p.paid_at AS paidAt,
      b.created_at AS createdAt
    FROM bookings b
    INNER JOIN trips t 
      ON t.trip_id = b.trip_id
    LEFT JOIN payments p 
      ON p.payment_id = (
        SELECT p2.payment_id
        FROM payments p2
        WHERE p2.booking_id = b.booking_id
        ORDER BY p2.created_at DESC
        LIMIT 1
      )
    WHERE b.user_id = ?
    ORDER BY b.created_at DESC
  `;

  return await query<TicketHistoryItem>(sql, [userId]);
}
