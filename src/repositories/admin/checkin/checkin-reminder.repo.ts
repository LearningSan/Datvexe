import type { PoolConnection } from "mysql2/promise";

import { connExecute, connQuery, execute, query } from "@/lib/server/mysql";

import type {
  CheckinReminderChannel,
  CheckinReminderType,
} from "@/types/admin/checkin/checkin-reminder.type";

export interface CheckinReminderCandidateRow {
  bookingId: number;
  bookingCodes: string;

  tripId: number;
  userId: number | null;

  passengerName: string;
  passengerPhone: string;
  passengerEmail: string | null;

  departureDatetime: string | Date;

  originName: string;
  destinationName: string;

  pickupPointName: string | null;
  pickupPointAddress: string | null;

  vehicleName: string | null;
  licensePlate: string | null;

  uncheckedSeatCount: number | string;
  seatNumbers: string | null;
}

interface ExistingReminderRow {
  checkinReminderId: number;

  status: "PROCESSING" | "SENT" | "FAILED";

  attemptCount: number;

  updatedAt: string | Date;
}

/**
 * Tìm booking:
 * - đã xác nhận;
 * - thanh toán thành công;
 * - chuyến còn hoạt động;
 * - khởi hành trong vòng 60 phút;
 * - còn ghế chưa check-in;
 * - có tài khoản user để nhận thông báo trong ứng dụng.
 */
export async function findCheckinReminderCandidates(
  limit: number,
): Promise<CheckinReminderCandidateRow[]> {
  return query<CheckinReminderCandidateRow>(
    `
      SELECT
        MIN(b.booking_id) AS bookingId,

        GROUP_CONCAT(
          DISTINCT b.booking_code
          ORDER BY b.booking_id
          SEPARATOR ', '
        ) AS bookingCodes,

        b.trip_id AS tripId,
        b.user_id AS userId,

        MAX(b.contact_name) AS passengerName,
        MAX(b.contact_phone) AS passengerPhone,
        MAX(b.contact_email) AS passengerEmail,

        t.departure_datetime AS departureDatetime,

        origin_city.city_name AS originName,
        destination_city.city_name AS destinationName,

        GROUP_CONCAT(
          DISTINCT pickup.point_name
          ORDER BY pickup.point_name
          SEPARATOR ', '
        ) AS pickupPointName,

        GROUP_CONCAT(
          DISTINCT pickup.address
          ORDER BY pickup.address
          SEPARATOR ', '
        ) AS pickupPointAddress,

        v.vehicle_name AS vehicleName,
        v.license_plate AS licensePlate,

        COUNT(DISTINCT bs.booking_seat_id) AS uncheckedSeatCount,

        GROUP_CONCAT(
          DISTINCT sld.seat_number
          ORDER BY sld.seat_number
          SEPARATOR ', '
        ) AS seatNumbers

      FROM bookings b

      INNER JOIN trips t
        ON t.trip_id = b.trip_id

      INNER JOIN routes r
        ON r.route_id = t.route_id

      INNER JOIN cities origin_city
        ON origin_city.city_id = r.origin_city_id

      INNER JOIN cities destination_city
        ON destination_city.city_id = r.destination_city_id

      INNER JOIN booking_seats bs
        ON bs.booking_id = b.booking_id
        AND bs.checkin_status = 'NOT_CHECKED_IN'

      INNER JOIN seat_layout_details sld
        ON sld.seat_layout_detail_id = bs.seat_layout_detail_id

      LEFT JOIN pickup_points pickup
        ON pickup.pickup_point_id = b.pickup_point_id

      LEFT JOIN vehicles v
        ON v.vehicle_id = t.vehicle_id

      WHERE
        b.user_id IS NOT NULL

        AND b.status = 'CONFIRMED'

        AND t.status IN ('OPEN', 'FULL')

        AND t.departure_datetime > NOW()

        AND t.departure_datetime <=
            DATE_ADD(NOW(), INTERVAL 60 MINUTE)

        AND (
          SELECT p.status
          FROM payments p
          WHERE p.booking_id = b.booking_id
          ORDER BY p.payment_id DESC
          LIMIT 1
        ) = 'PAID'

      GROUP BY
        b.user_id,
        b.trip_id,
        t.departure_datetime,
        origin_city.city_name,
        destination_city.city_name,
        v.vehicle_name,
        v.license_plate

      ORDER BY
        t.departure_datetime ASC,
        MIN(b.booking_id) ASC

      LIMIT ?
    `,
    [limit],
  );
}

/**
 * Chiếm quyền gửi reminder.
 *
 * Quy tắc:
 * - chưa có bản ghi: được gửi;
 * - SENT: không gửi lại;
 * - PROCESSING chưa quá 10 phút: cron khác đang xử lý;
 * - FAILED: retry sau ít nhất 5 phút;
 * - retry tối đa 3 lần;
 * - PROCESSING treo quá 10 phút: cho phép retry.
 */
export async function acquireCheckinReminder(
  conn: PoolConnection,
  input: {
    bookingId: number;
    tripId: number;
    userId: number;

    reminderType: CheckinReminderType;
    channel: CheckinReminderChannel;
  },
): Promise<{
  acquired: boolean;
  checkinReminderId: number | null;
  reason?: string;
}> {
  const rows = await connQuery<ExistingReminderRow>(
    conn,
    `
SELECT
  checkin_reminder_id AS checkinReminderId,
  status,
  attempt_count AS attemptCount,
  updated_at AS updatedAt
FROM checkin_reminders
WHERE user_id = ?
  AND trip_id = ?
  AND reminder_type = ?
  AND channel = ?
LIMIT 1
FOR UPDATE
    `,
    [input.userId, input.tripId, input.reminderType, input.channel],
  );

  const existing = rows[0];

  if (!existing) {
    const result = await connExecute(
      conn,
      `
    INSERT INTO checkin_reminders (
      booking_id,
      trip_id,
      user_id,
      reminder_type,
      channel,
      status,
      attempt_count,
      created_at,
      updated_at
    )
    VALUES (
      ?,
      ?,
      ?,
      ?,
      ?,
      'PROCESSING',
      1,
      NOW(),
      NOW()
    )
  `,
      [
        input.bookingId,
        input.tripId,
        input.userId,
        input.reminderType,
        input.channel,
      ],
    );

    return {
      acquired: true,
      checkinReminderId: Number(result.insertId),
    };
  }

  if (existing.status === "SENT") {
    return {
      acquired: false,
      checkinReminderId: existing.checkinReminderId,
      reason: "Reminder đã được gửi",
    };
  }

  if (existing.attemptCount >= 3) {
    return {
      acquired: false,
      checkinReminderId: existing.checkinReminderId,
      reason: "Reminder đã vượt quá số lần thử",
    };
  }

  const updatedAt = new Date(existing.updatedAt).getTime();
  const elapsedMinutes = (Date.now() - updatedAt) / (60 * 1000);

  if (existing.status === "PROCESSING" && elapsedMinutes < 10) {
    return {
      acquired: false,
      checkinReminderId: existing.checkinReminderId,
      reason: "Reminder đang được cron khác xử lý",
    };
  }

  if (existing.status === "FAILED" && elapsedMinutes < 5) {
    return {
      acquired: false,
      checkinReminderId: existing.checkinReminderId,
      reason: "Reminder đang chờ thời gian retry",
    };
  }

  await connExecute(
    conn,
    `
      UPDATE checkin_reminders
      SET
        status = 'PROCESSING',
        attempt_count = attempt_count + 1,
        error_message = NULL,
        updated_at = NOW()
      WHERE checkin_reminder_id = ?
    `,
    [existing.checkinReminderId],
  );

  return {
    acquired: true,
    checkinReminderId: existing.checkinReminderId,
  };
}

export async function markCheckinReminderSent(
  checkinReminderId: number,
): Promise<void> {
  await execute(
    `
      UPDATE checkin_reminders
      SET
        status = 'SENT',
        sent_at = NOW(),
        error_message = NULL,
        updated_at = NOW()
      WHERE checkin_reminder_id = ?
    `,
    [checkinReminderId],
  );
}

export async function markCheckinReminderFailed(
  checkinReminderId: number,
  errorMessage: string,
): Promise<void> {
  await execute(
    `
      UPDATE checkin_reminders
      SET
        status = 'FAILED',
        error_message = ?,
        updated_at = NOW()
      WHERE checkin_reminder_id = ?
    `,
    [errorMessage.slice(0, 500), checkinReminderId],
  );
}
