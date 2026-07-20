import { query } from "@/lib/server/mysql";
import type {
  AdminTicketListParams,
  AdminTicketItem,
  AdminTicketWarningSummary,
  AdminTicketDetail,
  AdminTicketSeat,
  AdminTicketHold,
  AdminTicketPayment,
  AdminTicketHistory,
  BookingStatus,
  AddTicketSeatsPayload,
  ChangeTicketSeatsPayload,
  CreateOfflineTicketPayload,
  TicketWarning,
} from "@/types/admin/tickets/ticket-management.type";
type ConfirmAdminTicketOptions = {
  markPaymentPaid: boolean;
};

/**
 * Xác nhận booking:
 * - Chuyển ghế đang giữ thành ghế đã đặt.
 * - Xóa dữ liệu giữ chỗ.
 * - Cập nhật booking thành CONFIRMED.
 * - Có thể đánh dấu thanh toán PAID.
 * - Đồng bộ lại số ghế trống của chuyến.
 */
export async function confirmAdminTicketRepo(
  bookingId: number,
  options: ConfirmAdminTicketOptions,
) {
  const booking = await findTicketBase(bookingId);

  if (!booking) {
    throw new Error("Không tìm thấy booking");
  }

  if (booking.status === "CANCELLED") {
    throw new Error("Không thể duyệt booking đã bị hủy");
  }

  if (booking.status === "REFUNDED") {
    throw new Error("Không thể duyệt booking đã hoàn tiền");
  }

  if (booking.status === "CONFIRMED") {
    // Dọn dữ liệu hold cũ nếu trước đây booking đã xác nhận
    // nhưng hold_expired_at hoặc seat_holds chưa được xóa.
    await query(`DELETE FROM seat_holds WHERE booking_id = ?`, [bookingId]);

    await query(
      `
      UPDATE bookings
      SET hold_expired_at = NULL
      WHERE booking_id = ?
      `,
      [bookingId],
    );

    await syncTripAvailableSeatsRepo(booking.trip_id);

    return {
      bookingId,
      tripId: booking.trip_id,
      status: "CONFIRMED" as const,
      alreadyConfirmed: true,
    };
  }

  /*
   * Kiểm tra booking đã có ghế chính thức hay chưa.
   *
   * Có hai trường hợp:
   * 1. Ghế đã được tạo trong booking_seats từ trước.
   * 2. Ghế mới chỉ đang nằm trong seat_holds.
   */
  const existingSeats = await query<{ seatCount: number }>(
    `
    SELECT COUNT(*) AS seatCount
    FROM booking_seats
    WHERE booking_id = ?
    `,
    [bookingId],
  );

  const existingSeatCount = Number(existingSeats[0]?.seatCount ?? 0);

  const holdRows = await query<{
    tripId: number;
    seatLayoutDetailId: number;
  }>(
    `
    SELECT
      trip_id AS tripId,
      seat_layout_detail_id AS seatLayoutDetailId
    FROM seat_holds
    WHERE booking_id = ?
    ORDER BY seat_hold_id ASC
    `,
    [bookingId],
  );

  /*
   * Nếu booking chưa có booking_seats thì chuyển seat_holds
   * thành ghế chính thức.
   */
  if (existingSeatCount === 0) {
    if (holdRows.length === 0) {
      throw new Error(
        "Booking không có ghế đang giữ để xác nhận. Vui lòng chọn lại ghế",
      );
    }

    const invalidTripHold = holdRows.some(
      (hold) => Number(hold.tripId) !== Number(booking.trip_id),
    );

    if (invalidTripHold) {
      throw new Error("Dữ liệu giữ ghế không thuộc chuyến của booking");
    }

    /*
     * Kiểm tra ghế đã bị booking khác đặt hay chưa.
     */
    const conflictingSeats = await query<{
      seatLayoutDetailId: number;
    }>(
      `
      SELECT
        sh.seat_layout_detail_id AS seatLayoutDetailId
      FROM seat_holds sh
      INNER JOIN booking_seats bs
        ON bs.trip_id = sh.trip_id
       AND bs.seat_layout_detail_id = sh.seat_layout_detail_id
       AND bs.booking_id <> sh.booking_id
      WHERE sh.booking_id = ?
      LIMIT 1
      `,
      [bookingId],
    );

    if (conflictingSeats.length > 0) {
      throw new Error(
        "Có ghế trong booking đã được đặt bởi đơn khác. Không thể duyệt",
      );
    }

    /*
     * Chuyển toàn bộ seat_holds của booking sang booking_seats.
     *
     * NOT EXISTS giúp tránh insert trùng nếu thao tác được gọi lại.
     */
    await query(
      `
      INSERT INTO booking_seats (
        booking_id,
        trip_id,
        seat_layout_detail_id,
        seat_price,
        checkin_status
      )
      SELECT
        sh.booking_id,
        sh.trip_id,
        sh.seat_layout_detail_id,
        b.seat_price,
        'NOT_CHECKED_IN'
      FROM seat_holds sh
      INNER JOIN bookings b
        ON b.booking_id = sh.booking_id
      WHERE sh.booking_id = ?
        AND NOT EXISTS (
          SELECT 1
          FROM booking_seats bs
          WHERE bs.booking_id = sh.booking_id
            AND bs.trip_id = sh.trip_id
            AND bs.seat_layout_detail_id = sh.seat_layout_detail_id
        )
      `,
      [bookingId],
    );
  }

  /*
   * Kiểm tra lại sau khi chuyển hold.
   */
  const confirmedSeats = await query<{ seatCount: number }>(
    `
    SELECT COUNT(*) AS seatCount
    FROM booking_seats
    WHERE booking_id = ?
    `,
    [bookingId],
  );

  const confirmedSeatCount = Number(confirmedSeats[0]?.seatCount ?? 0);

  if (confirmedSeatCount <= 0) {
    throw new Error("Không thể tạo ghế chính thức cho booking");
  }

  /*
   * Admin có thể đánh dấu giao dịch gần nhất là PAID.
   */
  if (options.markPaymentPaid) {
    await query(
      `
      UPDATE payments
      SET
        status = 'PAID',
        paid_at = COALESCE(paid_at, NOW())
      WHERE booking_id = ?
      ORDER BY payment_id DESC
      LIMIT 1
      `,
      [bookingId],
    );
  }

  /*
   * Cập nhật booking thành CONFIRMED và xóa thời hạn giữ.
   */
  await query(
    `
    UPDATE bookings
    SET
      status = 'CONFIRMED',
      hold_expired_at = NULL,
      cancel_reason = NULL
    WHERE booking_id = ?
    `,
    [bookingId],
  );

  /*
   * Ghế đã trở thành booking_seats nên không cần giữ nữa.
   */
  await query(`DELETE FROM seat_holds WHERE booking_id = ?`, [bookingId]);

  await syncTripAvailableSeatsRepo(booking.trip_id);

  return {
    bookingId,
    tripId: booking.trip_id,
    status: "CONFIRMED" as const,
    seatCount: confirmedSeatCount,
    alreadyConfirmed: false,
  };
}
export async function ensureBookingHistoryTable() {
  await query(`
    CREATE TABLE IF NOT EXISTS booking_histories (
      history_id BIGINT PRIMARY KEY AUTO_INCREMENT,
      booking_id BIGINT NOT NULL,
      action_type VARCHAR(50) NOT NULL,
      old_value TEXT NULL,
      new_value TEXT NULL,
      reason VARCHAR(255) NULL,
      performed_by_user_id BIGINT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_booking_history_booking (booking_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

function buildWarningSql(warning?: TicketWarning) {
  if (!warning) return "";
  const map: Record<TicketWarning, string> = {
    HOLD_EXPIRING_SOON: `
      AND b.status = 'PENDING'
      AND b.hold_expired_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 MINUTE)
    `,
    HOLD_EXPIRED_NOT_CANCELLED: `
      AND b.status = 'PENDING'
      AND b.hold_expired_at IS NOT NULL
      AND b.hold_expired_at < NOW()
    `,
    CONFIRMED_MISSING_SEAT: `
      AND b.status = 'CONFIRMED'
      AND NOT EXISTS (SELECT 1 FROM booking_seats bs WHERE bs.booking_id = b.booking_id)
    `,
    DUPLICATED_SEAT: `
      AND EXISTS (
        SELECT 1
        FROM booking_seats bs1
        JOIN booking_seats bs2
          ON bs2.trip_id = bs1.trip_id
         AND bs2.seat_layout_detail_id = bs1.seat_layout_detail_id
         AND bs2.booking_seat_id <> bs1.booking_seat_id
        WHERE bs1.booking_id = b.booking_id
      )
    `,
    CANCELLED_SEAT_NOT_RELEASED: `
      AND b.status = 'CANCELLED'
      AND EXISTS (SELECT 1 FROM booking_seats bs WHERE bs.booking_id = b.booking_id)
    `,
    REFUNDED_STATUS_NOT_UPDATED: `
      AND EXISTS (
        SELECT 1 FROM payments p
        WHERE p.booking_id = b.booking_id
          AND p.status = 'REFUNDED'
      )
      AND b.status <> 'REFUNDED'
    `,
    DEPARTING_SOON_NOT_CHECKED_IN: `
      AND b.status = 'CONFIRMED'
      AND t.departure_datetime BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 2 HOUR)
      AND EXISTS (
        SELECT 1 FROM booking_seats bs
        WHERE bs.booking_id = b.booking_id
          AND bs.checkin_status = 'NOT_CHECKED_IN'
      )
    `,
  };
  return map[warning];
}

export function buildTicketWarnings(row: any): TicketWarning[] {
  const warnings: TicketWarning[] = [];
  const now = Date.now();
  const departureMs = row.departureDatetime
    ? new Date(row.departureDatetime).getTime()
    : 0;
  const holdMs = row.holdExpiredAt ? new Date(row.holdExpiredAt).getTime() : 0;

  if (
    row.bookingStatus === "PENDING" &&
    holdMs > now &&
    holdMs - now <= 30 * 60 * 1000
  ) {
    warnings.push("HOLD_EXPIRING_SOON");
  }
  if (row.bookingStatus === "PENDING" && holdMs > 0 && holdMs < now) {
    warnings.push("HOLD_EXPIRED_NOT_CANCELLED");
  }
  if (row.bookingStatus === "CONFIRMED" && Number(row.seatCount ?? 0) <= 0) {
    warnings.push("CONFIRMED_MISSING_SEAT");
  }
  if (Number(row.duplicatedSeatCount ?? 0) > 0) {
    warnings.push("DUPLICATED_SEAT");
  }
  if (row.bookingStatus === "CANCELLED" && Number(row.seatCount ?? 0) > 0) {
    warnings.push("CANCELLED_SEAT_NOT_RELEASED");
  }
  if (row.paymentStatus === "REFUNDED" && row.bookingStatus !== "REFUNDED") {
    warnings.push("REFUNDED_STATUS_NOT_UPDATED");
  }
  if (
    row.bookingStatus === "CONFIRMED" &&
    departureMs > now &&
    departureMs - now <= 2 * 60 * 60 * 1000 &&
    row.checkinStatus !== "CHECKED_IN"
  ) {
    warnings.push("DEPARTING_SOON_NOT_CHECKED_IN");
  }

  return warnings;
}

export async function findAdminTickets(params: AdminTicketListParams) {
  const page = params.page ?? 1;
  const limit = params.limit ?? 10;
  const offset = (page - 1) * limit;
  const keyword = params.keyword?.trim() ?? "";

  let where = `
    WHERE (
      ? = ''
      OR b.booking_code LIKE ?
      OR b.contact_name LIKE ?
      OR b.contact_phone LIKE ?
      OR u.full_name LIKE ?
    )
  `;
  const values: any[] = [
    keyword,
    `%${keyword}%`,
    `%${keyword}%`,
    `%${keyword}%`,
    `%${keyword}%`,
  ];

  if (params.bookingCode) {
    where += ` AND b.booking_code LIKE ?`;
    values.push(`%${params.bookingCode.trim()}%`);
  }
  if (params.customerName) {
    where += ` AND b.contact_name LIKE ?`;
    values.push(`%${params.customerName.trim()}%`);
  }
  if (params.customerPhone) {
    where += ` AND b.contact_phone LIKE ?`;
    values.push(`%${params.customerPhone.trim()}%`);
  }
  if (params.routeId) {
    where += ` AND t.route_id = ?`;
    values.push(params.routeId);
  }
  if (params.tripId) {
    where += ` AND b.trip_id = ?`;
    values.push(params.tripId);
  }
  if (params.departureDate) {
    where += ` AND DATE(t.departure_datetime) = ?`;
    values.push(params.departureDate);
  }
  if (params.bookingStatus) {
    where += ` AND b.status = ?`;
    values.push(params.bookingStatus);
  }
  if (params.paymentStatus) {
    where += ` AND latest_payment.status = ?`;
    values.push(params.paymentStatus);
  }
  if (params.holdStatus === "HOLDING" || params.onlyHolding) {
  where += `
    AND b.status = 'PENDING'
    AND b.hold_expired_at IS NOT NULL
    AND b.hold_expired_at > NOW()
  `;
}
 if (params.holdStatus === "EXPIRED") {
  where += `
    AND b.status = 'PENDING'
    AND b.hold_expired_at IS NOT NULL
    AND b.hold_expired_at <= NOW()
  `;
}
  if (params.holdStatus === "NONE") {
  where += `
    AND (
      b.status <> 'PENDING'
      OR b.hold_expired_at IS NULL
    )
  `;
}

  where += buildWarningSql(params.warning);

  const fromSql = `
    FROM bookings b
    LEFT JOIN users u ON u.user_id = b.user_id
    INNER JOIN trips t ON t.trip_id = b.trip_id
    INNER JOIN routes r ON r.route_id = t.route_id
    INNER JOIN cities oc ON oc.city_id = r.origin_city_id
    INNER JOIN cities dc ON dc.city_id = r.destination_city_id
    LEFT JOIN (
      SELECT p1.*
      FROM payments p1
      INNER JOIN (
        SELECT booking_id, MAX(payment_id) AS payment_id
        FROM payments
        GROUP BY booking_id
      ) x ON x.payment_id = p1.payment_id
    ) latest_payment ON latest_payment.booking_id = b.booking_id
  `;

  const selectSql = `
    SELECT
      b.booking_id AS bookingId,
      b.booking_code AS bookingCode,
      COALESCE(u.full_name, b.contact_name) AS customerName,
      b.contact_phone AS customerPhone,
      b.contact_email AS customerEmail,
      CONCAT(oc.city_name, ' → ', dc.city_name) AS routeName,
      b.trip_id AS tripId,
      t.departure_datetime AS departureDatetime,
      GROUP_CONCAT(DISTINCT sld.seat_number ORDER BY sld.floor_no, sld.row_no, sld.column_no SEPARATOR ', ') AS seatNumbers,
      COUNT(DISTINCT bs.booking_seat_id) AS seatCount,
      b.total_amount AS totalAmount,
      b.status AS bookingStatus,
      latest_payment.status AS paymentStatus,
     CASE
  WHEN b.status <> 'PENDING' THEN 'NONE'
  WHEN b.hold_expired_at IS NULL THEN 'NONE'
  WHEN b.hold_expired_at > NOW() THEN 'HOLDING'
  ELSE 'EXPIRED'
END AS holdStatus,
      b.hold_expired_at AS holdExpiredAt,
      CASE
        WHEN COUNT(DISTINCT bs.booking_seat_id) = 0 THEN 'NOT_CHECKED_IN'
        WHEN SUM(CASE WHEN bs.checkin_status = 'CHECKED_IN' THEN 1 ELSE 0 END) = COUNT(DISTINCT bs.booking_seat_id) THEN 'CHECKED_IN'
        WHEN SUM(CASE WHEN bs.checkin_status = 'CHECKED_IN' THEN 1 ELSE 0 END) > 0 THEN 'PARTIAL'
        ELSE 'NOT_CHECKED_IN'
      END AS checkinStatus,
      (
        SELECT COUNT(*)
        FROM booking_seats d1
        JOIN booking_seats d2
          ON d2.trip_id = d1.trip_id
         AND d2.seat_layout_detail_id = d1.seat_layout_detail_id
         AND d2.booking_seat_id <> d1.booking_seat_id
        WHERE d1.booking_id = b.booking_id
      ) AS duplicatedSeatCount,
      b.created_at AS createdAt
    ${fromSql}
    LEFT JOIN booking_seats bs ON bs.booking_id = b.booking_id
    LEFT JOIN seat_layout_details sld ON sld.seat_layout_detail_id = bs.seat_layout_detail_id
    ${where}
    GROUP BY
      b.booking_id, b.booking_code, u.full_name, b.contact_name, b.contact_phone,
      b.contact_email, oc.city_name, dc.city_name, b.trip_id, t.departure_datetime,
      b.total_amount, b.status, latest_payment.status, b.hold_expired_at, b.created_at
  `;

  let having = "";
  if (params.onlyNeedAction) {
    having = ` HAVING duplicatedSeatCount > 0
      OR (bookingStatus = 'PENDING' AND holdExpiredAt IS NOT NULL AND holdExpiredAt < NOW())
      OR (bookingStatus = 'CONFIRMED' AND seatCount = 0)
      OR (bookingStatus = 'CANCELLED' AND seatCount > 0)
      OR (paymentStatus = 'REFUNDED' AND bookingStatus <> 'REFUNDED')
      OR (bookingStatus = 'CONFIRMED' AND departureDatetime BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 2 HOUR) AND checkinStatus <> 'CHECKED_IN')
    `;
  }

  const itemsSql = `
    ${selectSql}
    ${having}
    ORDER BY b.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM (${selectSql} ${having}) x
  `;

  const rows = await query<any>(itemsSql, [...values, limit, offset]);
  const countRows = await query<{ total: number }>(countSql, values);

  const items: AdminTicketItem[] = rows.map((row) => {
    const warnings = buildTicketWarnings(row);
    return {
      ...row,
      totalAmount: Number(row.totalAmount ?? 0),
      seatCount: Number(row.seatCount ?? 0),
      needAction: warnings.length > 0,
      warnings,
    };
  });

  return {
    items,
    total: Number(countRows[0]?.total ?? 0),
    page,
    limit,
    summary: await getAdminTicketWarnings(),
  };
}

export async function getAdminTicketWarnings(): Promise<AdminTicketWarningSummary> {
  const [row] = await query<any>(`
    SELECT
      SUM(CASE WHEN b.status = 'PENDING' AND b.hold_expired_at BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 30 MINUTE) THEN 1 ELSE 0 END) AS holdExpiringSoon,
      SUM(CASE WHEN b.status = 'PENDING' AND b.hold_expired_at IS NOT NULL AND b.hold_expired_at < NOW() THEN 1 ELSE 0 END) AS holdExpiredNotCancelled,
      SUM(CASE WHEN b.status = 'CONFIRMED' AND NOT EXISTS (SELECT 1 FROM booking_seats bs WHERE bs.booking_id = b.booking_id) THEN 1 ELSE 0 END) AS confirmedMissingSeats,
      SUM(CASE WHEN EXISTS (
        SELECT 1 FROM booking_seats bs1
        JOIN booking_seats bs2 ON bs2.trip_id = bs1.trip_id AND bs2.seat_layout_detail_id = bs1.seat_layout_detail_id AND bs2.booking_seat_id <> bs1.booking_seat_id
        WHERE bs1.booking_id = b.booking_id
      ) THEN 1 ELSE 0 END) AS duplicatedSeats,
      SUM(CASE WHEN b.status = 'CANCELLED' AND EXISTS (SELECT 1 FROM booking_seats bs WHERE bs.booking_id = b.booking_id) THEN 1 ELSE 0 END) AS cancelledSeatNotReleased,
      SUM(CASE WHEN EXISTS (SELECT 1 FROM payments p WHERE p.booking_id = b.booking_id AND p.status = 'REFUNDED') AND b.status <> 'REFUNDED' THEN 1 ELSE 0 END) AS refundedStatusNotUpdated,
      SUM(CASE WHEN b.status = 'CONFIRMED' AND t.departure_datetime BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 2 HOUR)
        AND EXISTS (SELECT 1 FROM booking_seats bs WHERE bs.booking_id = b.booking_id AND bs.checkin_status = 'NOT_CHECKED_IN') THEN 1 ELSE 0 END) AS departingSoonNotCheckedIn
    FROM bookings b
    INNER JOIN trips t ON t.trip_id = b.trip_id
  `);

  return {
    holdExpiringSoon: Number(row?.holdExpiringSoon ?? 0),
    holdExpiredNotCancelled: Number(row?.holdExpiredNotCancelled ?? 0),
    confirmedMissingSeats: Number(row?.confirmedMissingSeats ?? 0),
    duplicatedSeats: Number(row?.duplicatedSeats ?? 0),
    cancelledSeatNotReleased: Number(row?.cancelledSeatNotReleased ?? 0),
    refundedStatusNotUpdated: Number(row?.refundedStatusNotUpdated ?? 0),
    departingSoonNotCheckedIn: Number(row?.departingSoonNotCheckedIn ?? 0),
  };
}

export async function findAdminTicketOptions() {
  const routes = await query<any>(`
    SELECT r.route_id AS routeId, CONCAT(oc.city_name, ' → ', dc.city_name) AS routeName
    FROM routes r
    INNER JOIN cities oc ON oc.city_id = r.origin_city_id
    INNER JOIN cities dc ON dc.city_id = r.destination_city_id
    ORDER BY oc.city_name, dc.city_name
  `);

  const trips = await query<any>(`
  SELECT
    t.trip_id AS tripId,
    t.route_id AS routeId,
    CONCAT(
      oc.city_name,
      ' → ',
      dc.city_name,
      ' - ',
      DATE_FORMAT(t.departure_datetime, '%d/%m/%Y %H:%i')
    ) AS tripName,
    DATE_FORMAT(t.departure_datetime, '%Y-%m-%d %H:%i:%s') AS departureDatetime,

    vt.type_name AS vehicleTypeName,
    v.vehicle_name AS vehicleName,
    v.license_plate AS licensePlate,
    sl.total_seats AS totalSeats
  FROM trips t
  INNER JOIN routes r ON r.route_id = t.route_id
  INNER JOIN cities oc ON oc.city_id = r.origin_city_id
  INNER JOIN cities dc ON dc.city_id = r.destination_city_id
  LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
  LEFT JOIN vehicle_types vt ON vt.vehicle_type_id = v.vehicle_type_id
  LEFT JOIN seat_layouts sl ON sl.seat_layout_id = v.seat_layout_id
  WHERE t.status IN ('OPEN', 'FULL', 'RUNNING')
    AND t.departure_datetime >= NOW()
  ORDER BY t.departure_datetime ASC
  LIMIT 1000
`);

  const pickupPoints = await query<any>(`
    SELECT pickup_point_id AS pickupPointId, point_name AS pointName, address
    FROM pickup_points
    WHERE is_active = TRUE
    ORDER BY point_name ASC
  `);

  return { routes, trips, pickupPoints };
}

export async function findTicketBase(bookingId: number) {
  const rows = await query<any>(
    `
    SELECT * FROM bookings WHERE booking_id = ? LIMIT 1
  `,
    [bookingId],
  );
  return rows[0] ?? null;
}

export async function findAdminTicketDetail(
  bookingId: number,
): Promise<AdminTicketDetail | null> {
  await ensureBookingHistoryTable();

  const rows = await query<any>(
    `
    SELECT
      b.booking_id AS bookingId,
      b.booking_code AS bookingCode,
      b.booking_type AS bookingType,
      b.status AS bookingStatus,
      b.total_amount AS totalAmount,
      b.seat_price AS seatPrice,
      b.contact_name AS contactName,
      b.contact_phone AS contactPhone,
      b.contact_email AS contactEmail,
      b.user_id AS userId,
      CASE WHEN b.booking_type = 'OFFLINE' THEN 'OFFLINE' WHEN b.user_id IS NULL THEN 'GUEST' ELSE 'REGISTERED' END AS customerType,
      b.trip_id AS tripId,
      CONCAT(oc.city_name, ' → ', dc.city_name) AS routeName,
      oc.city_name AS originCityName,
      dc.city_name AS destinationCityName,
      t.departure_datetime AS departureDatetime,
      t.arrival_datetime AS arrivalDatetime,
      v.vehicle_name AS vehicleName,
      v.license_plate AS licensePlate,
      GROUP_CONCAT(DISTINCT du.full_name SEPARATOR ', ') AS driverNames,
      t.status AS tripStatus,
      b.pickup_point_id AS pickupPointId,
      pp.point_name AS pickupPointName,
      pp.address AS pickupAddress,
      b.dropoff_point_id AS dropoffPointId,
      dp.point_name AS dropoffPointName,
      dp.address AS dropoffAddress,
      b.hold_expired_at AS holdExpiredAt,
      CASE WHEN b.hold_expired_at IS NULL THEN 'NONE' WHEN b.hold_expired_at > NOW() THEN 'HOLDING' ELSE 'EXPIRED' END AS holdStatus,
      lp.status AS paymentStatus,
      lp.payment_method AS paymentMethod,
      lp.paid_at AS paidAt,
      lp.transaction_code AS transactionCode,
      b.cancel_reason AS cancelReason,
      b.created_at AS createdAt
    FROM bookings b
    INNER JOIN trips t ON t.trip_id = b.trip_id
    INNER JOIN routes r ON r.route_id = t.route_id
    INNER JOIN cities oc ON oc.city_id = r.origin_city_id
    INNER JOIN cities dc ON dc.city_id = r.destination_city_id
    LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
    LEFT JOIN trip_drivers td ON td.trip_id = t.trip_id
    LEFT JOIN drivers d ON d.driver_id = td.driver_id
    LEFT JOIN users du ON du.user_id = d.user_id
    LEFT JOIN pickup_points pp ON pp.pickup_point_id = b.pickup_point_id
    LEFT JOIN pickup_points dp ON dp.pickup_point_id = b.dropoff_point_id
    LEFT JOIN (
      SELECT p1.*
      FROM payments p1
      INNER JOIN (SELECT booking_id, MAX(payment_id) payment_id FROM payments GROUP BY booking_id) x
        ON x.payment_id = p1.payment_id
    ) lp ON lp.booking_id = b.booking_id
    WHERE b.booking_id = ?
    GROUP BY b.booking_id, lp.payment_id
  `,
    [bookingId],
  );

  if (!rows[0]) return null;

  const seats = await findTicketSeats(bookingId);
  const holds = await findTicketHolds(bookingId);
  const payments = await findTicketPayments(bookingId);
  const histories = await findTicketHistories(bookingId);

  return {
    ...rows[0],
    totalAmount: Number(rows[0].totalAmount ?? 0),
    seatPrice: Number(rows[0].seatPrice ?? 0),
    seats,
    holds,
    payments,
    histories,
  };
}

export async function findTicketSeats(
  bookingId: number,
): Promise<AdminTicketSeat[]> {
  const rows = await query<any>(
    `
    SELECT
      bs.booking_seat_id AS bookingSeatId,
      bs.seat_layout_detail_id AS seatLayoutDetailId,
      sld.seat_number AS seatNumber,
      sld.floor_no AS floorNo,
      sld.row_no AS rowNo,
      sld.column_no AS columnNo,
      bs.seat_price AS seatPrice,
      bs.checkin_status AS checkinStatus
    FROM booking_seats bs
    INNER JOIN seat_layout_details sld ON sld.seat_layout_detail_id = bs.seat_layout_detail_id
    WHERE bs.booking_id = ?
    ORDER BY sld.floor_no, sld.row_no, sld.column_no
  `,
    [bookingId],
  );

  return rows.map((r) => ({ ...r, seatPrice: Number(r.seatPrice ?? 0) }));
}

export async function findTicketHolds(
  bookingId: number,
): Promise<AdminTicketHold[]> {
  const rows = await query<any>(
    `
    SELECT
      sh.seat_hold_id AS seatHoldId,
      sh.seat_layout_detail_id AS seatLayoutDetailId,
      sld.seat_number AS seatNumber,
      sh.expired_at AS expiredAt,
      sh.expired_at <= NOW() AS isExpired,
      GREATEST(TIMESTAMPDIFF(SECOND, NOW(), sh.expired_at), 0) AS remainingSeconds
    FROM seat_holds sh
    INNER JOIN seat_layout_details sld ON sld.seat_layout_detail_id = sh.seat_layout_detail_id
    WHERE sh.booking_id = ?
    ORDER BY sld.floor_no, sld.row_no, sld.column_no
  `,
    [bookingId],
  );
  return rows.map((r) => ({
    ...r,
    isExpired: !!r.isExpired,
    remainingSeconds: Number(r.remainingSeconds ?? 0),
  }));
}

export async function findTicketPayments(
  bookingId: number,
): Promise<AdminTicketPayment[]> {
  const rows = await query<any>(
    `
    SELECT
      payment_id AS paymentId,
      payment_method AS paymentMethod,
      amount,
      status,
      transaction_code AS transactionCode,
      paid_at AS paidAt,
      created_at AS createdAt
    FROM payments
    WHERE booking_id = ?
    ORDER BY payment_id DESC
  `,
    [bookingId],
  );
  return rows.map((r) => ({ ...r, amount: Number(r.amount ?? 0) }));
}

export async function findTicketHistories(
  bookingId: number,
): Promise<AdminTicketHistory[]> {
  await ensureBookingHistoryTable();
  return await query<any>(
    `
    SELECT
      bh.history_id AS historyId,
      bh.booking_id AS bookingId,
      bh.action_type AS actionType,
      bh.old_value AS oldValue,
      bh.new_value AS newValue,
      bh.reason,
      bh.performed_by_user_id AS performedByUserId,
      u.full_name AS performedByName,
      bh.created_at AS createdAt
    FROM booking_histories bh
    LEFT JOIN users u ON u.user_id = bh.performed_by_user_id
    WHERE bh.booking_id = ?
    ORDER BY bh.created_at DESC
  `,
    [bookingId],
  );
}

export async function createTicketHistory(data: {
  bookingId: number;
  actionType: string;
  oldValue?: any;
  newValue?: any;
  reason?: string | null;
  performedByUserId?: number | null;
}) {
  await ensureBookingHistoryTable();
  await query(
    `
    INSERT INTO booking_histories (booking_id, action_type, old_value, new_value, reason, performed_by_user_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `,
    [
      data.bookingId,
      data.actionType,
      data.oldValue == null ? null : JSON.stringify(data.oldValue),
      data.newValue == null ? null : JSON.stringify(data.newValue),
      data.reason ?? null,
      data.performedByUserId ?? null,
    ],
  );
}

export async function updateTicketStatusRepo(
  bookingId: number,
  status: BookingStatus,
  reason?: string,
) {
  await query(
    `
    UPDATE bookings
    SET status = ?, cancel_reason = CASE WHEN ? = 'CANCELLED' THEN ? ELSE cancel_reason END
    WHERE booking_id = ?
  `,
    [status, status, reason ?? null, bookingId],
  );
  return { bookingId, status };
}

export async function markLatestPaymentPaidRepo(bookingId: number) {
  await query(
    `
    UPDATE payments
    SET status = 'PAID', paid_at = COALESCE(paid_at, NOW())
    WHERE booking_id = ?
    ORDER BY payment_id DESC
    LIMIT 1
  `,
    [bookingId],
  );
}

export async function releaseTicketSeatsRepo(bookingId: number) {
  const booking = await findTicketBase(bookingId);
  if (!booking) return;

  const seats = await findTicketSeats(bookingId);
  await query(`DELETE FROM booking_seats WHERE booking_id = ?`, [bookingId]);
  await syncTripAvailableSeatsRepo(booking.trip_id);

  return seats;
}

export async function cancelTicketHoldsRepo(bookingId: number) {
  await query(`DELETE FROM seat_holds WHERE booking_id = ?`, [bookingId]);
  await query(
    `UPDATE bookings SET hold_expired_at = NULL WHERE booking_id = ?`,
    [bookingId],
  );
}

export async function extendTicketHoldRepo(bookingId: number, minutes: number) {
  await query(
    `
    UPDATE seat_holds
    SET expired_at = DATE_ADD(NOW(), INTERVAL ? MINUTE)
    WHERE booking_id = ?
  `,
    [minutes, bookingId],
  );

  await query(
    `
    UPDATE bookings
    SET hold_expired_at = DATE_ADD(NOW(), INTERVAL ? MINUTE)
    WHERE booking_id = ?
  `,
    [minutes, bookingId],
  );

  return { bookingId, minutes };
}

export async function releaseExpiredHoldsRepo() {
  const expired = await query<any>(`
    SELECT DISTINCT booking_id AS bookingId
    FROM seat_holds
    WHERE expired_at < NOW()
  `);

  await query(`DELETE FROM seat_holds WHERE expired_at < NOW()`);
  await query(`
    UPDATE bookings
    SET status = 'CANCELLED',
        cancel_reason = COALESCE(cancel_reason, 'Tự động hủy do hết hạn giữ chỗ')
    WHERE status = 'PENDING'
      AND hold_expired_at IS NOT NULL
      AND hold_expired_at < NOW()
  `);

  return { affectedBookings: expired.length };
}

export async function assertSeatsAvailableForBooking(
  bookingId: number,
  tripId: number,
  seatLayoutDetailIds: number[],
  ignoredBookingSeatIds: number[] = [],
) {
  if (seatLayoutDetailIds.length === 0) throw new Error("Chưa chọn ghế");

  const duplicateInPayload = new Set(seatLayoutDetailIds);
  if (duplicateInPayload.size !== seatLayoutDetailIds.length) {
    throw new Error("Danh sách ghế chọn bị trùng");
  }

  const placeholders = seatLayoutDetailIds.map(() => "?").join(",");
  const ignoreSql = ignoredBookingSeatIds.length
    ? `AND booking_seat_id NOT IN (${ignoredBookingSeatIds.map(() => "?").join(",")})`
    : "";

  const booked = await query<any>(
    `
    SELECT booking_seat_id
    FROM booking_seats
    WHERE trip_id = ?
      AND seat_layout_detail_id IN (${placeholders})
      ${ignoreSql}
    LIMIT 1
  `,
    [tripId, ...seatLayoutDetailIds, ...ignoredBookingSeatIds],
  );

  if (booked[0]) throw new Error("Có ghế đã được đặt bởi booking khác");

  const held = await query<any>(
    `
    SELECT seat_hold_id
    FROM seat_holds
    WHERE trip_id = ?
      AND seat_layout_detail_id IN (${placeholders})
      AND booking_id <> ?
      AND expired_at > NOW()
    LIMIT 1
  `,
    [tripId, ...seatLayoutDetailIds, bookingId],
  );

  if (held[0]) throw new Error("Có ghế đang được giữ bởi booking khác");
}

export async function addTicketSeatsRepo(
  bookingId: number,
  payload: AddTicketSeatsPayload,
) {
  const booking = await findTicketBase(bookingId);
  if (!booking) throw new Error("Không tìm thấy booking");

  await assertSeatsAvailableForBooking(
    bookingId,
    booking.trip_id,
    payload.seatLayoutDetailIds,
  );

  for (const seatId of payload.seatLayoutDetailIds) {
    await query(
      `
      INSERT INTO booking_seats (booking_id, trip_id, seat_layout_detail_id, seat_price)
      VALUES (?, ?, ?, ?)
    `,
      [bookingId, booking.trip_id, seatId, booking.seat_price],
    );
  }

  await syncTripAvailableSeatsRepo(booking.trip_id);
  return { bookingId };
}

export async function changeTicketSeatsRepo(
  bookingId: number,
  payload: ChangeTicketSeatsPayload,
) {
  const booking = await findTicketBase(bookingId);
  if (!booking) throw new Error("Không tìm thấy booking");

  if (
    payload.oldBookingSeatIds.length !== payload.newSeatLayoutDetailIds.length
  ) {
    throw new Error("Số ghế cũ và ghế mới phải bằng nhau");
  }

  await assertSeatsAvailableForBooking(
    bookingId,
    booking.trip_id,
    payload.newSeatLayoutDetailIds,
    payload.oldBookingSeatIds,
  );

  for (let i = 0; i < payload.oldBookingSeatIds.length; i++) {
    await query(
      `
      UPDATE booking_seats
      SET seat_layout_detail_id = ?
      WHERE booking_id = ?
        AND booking_seat_id = ?
    `,
      [
        payload.newSeatLayoutDetailIds[i],
        bookingId,
        payload.oldBookingSeatIds[i],
      ],
    );
  }

  await syncTripAvailableSeatsRepo(booking.trip_id);
  return { bookingId };
}

export async function removeTicketSeatRepo(
  bookingId: number,
  bookingSeatId: number,
) {
  const booking = await findTicketBase(bookingId);
  await query(
    `DELETE FROM booking_seats WHERE booking_id = ? AND booking_seat_id = ?`,
    [bookingId, bookingSeatId],
  );
  if (booking) await syncTripAvailableSeatsRepo(booking.trip_id);
  return { bookingId, bookingSeatId };
}

export async function syncTripAvailableSeatsRepo(tripId: number) {
  await query(
    `
    UPDATE trips t
    LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
    LEFT JOIN seat_layouts sl ON sl.seat_layout_id = v.seat_layout_id
    SET t.available_seats = GREATEST(
      COALESCE(sl.total_seats, t.available_seats) -
      (
        SELECT COUNT(*)
        FROM booking_seats bs
        INNER JOIN bookings b ON b.booking_id = bs.booking_id
        WHERE bs.trip_id = t.trip_id
          AND b.status IN ('PENDING', 'CONFIRMED')
      ),
      0
    )
    WHERE t.trip_id = ?
  `,
    [tripId],
  );
}

export async function updatePickupDropoffRepo(
  bookingId: number,
  pickupPointId?: number | null,
  dropoffPointId?: number | null,
) {
  await query(
    `
    UPDATE bookings
    SET pickup_point_id = ?, dropoff_point_id = ?
    WHERE booking_id = ?
  `,
    [pickupPointId ?? null, dropoffPointId ?? null, bookingId],
  );
  return { bookingId };
}

export async function checkinBookingRepo(bookingId: number) {
  await query(
    `
    UPDATE booking_seats
    SET checkin_status = 'CHECKED_IN'
    WHERE booking_id = ?
  `,
    [bookingId],
  );
  return { bookingId };
}

export async function checkinSeatRepo(
  bookingId: number,
  bookingSeatId: number,
) {
  await query(
    `
    UPDATE booking_seats
    SET checkin_status = 'CHECKED_IN'
    WHERE booking_id = ?
      AND booking_seat_id = ?
  `,
    [bookingId, bookingSeatId],
  );
  return { bookingId, bookingSeatId };
}

export async function createNotificationForBookingUser(
  bookingId: number,
  title: string,
  content: string,
) {
  await query(
    `
    INSERT INTO notifications (user_id, title, content, notification_type)
    SELECT user_id, ?, ?, 'BOOKING'
    FROM bookings
    WHERE booking_id = ?
      AND user_id IS NOT NULL
  `,
    [title, content, bookingId],
  );
}

function createBookingCode() {
  return `BK${Date.now().toString().slice(-8)}${Math.floor(Math.random() * 90 + 10)}`;
}

export async function createOfflineTicketRepo(
  payload: CreateOfflineTicketPayload,
) {
  const tripRows = await query<any>(
    `
    SELECT
      t.trip_id AS tripId,
      COALESCE(t.ticket_price, st.base_price, r.base_price, 0) AS ticketPrice
    FROM trips t
    LEFT JOIN schedule_templates st ON st.schedule_template_id = t.schedule_template_id
    LEFT JOIN routes r ON r.route_id = t.route_id
    WHERE t.trip_id = ?
    LIMIT 1
  `,
    [payload.tripId],
  );

  const trip = tripRows[0];
  if (!trip) throw new Error("Không tìm thấy chuyến");

  const totalAmount =
    Number(trip.ticketPrice ?? 0) * payload.seatLayoutDetailIds.length;
  const bookingCode = createBookingCode();

  await assertSeatsAvailableForBooking(
    0,
    payload.tripId,
    payload.seatLayoutDetailIds,
  );

  const result: any = await query(
    `
    INSERT INTO bookings (
      booking_code, user_id, trip_id, pickup_point_id, dropoff_point_id,
      booking_type, status, total_amount, contact_name, contact_phone,
      contact_email, seat_price, hold_expired_at, created_by
    )
    VALUES (?, NULL, ?, ?, ?, 'OFFLINE', ?, ?, ?, ?, ?, ?, NULL, NULL)
  `,
    [
      bookingCode,
      payload.tripId,
      payload.pickupPointId ?? null,
      payload.dropoffPointId ?? null,
      payload.paid ? "CONFIRMED" : "PENDING",
      totalAmount,
      payload.passengerName,
      payload.passengerPhone,
      payload.passengerEmail ?? null,
      Number(trip.ticketPrice ?? 0),
    ],
  );

  const bookingId = Number(result.insertId);

  for (const seatId of payload.seatLayoutDetailIds) {
    await query(
      `
      INSERT INTO booking_seats (booking_id, trip_id, seat_layout_detail_id, seat_price)
      VALUES (?, ?, ?, ?)
    `,
      [bookingId, payload.tripId, seatId, Number(trip.ticketPrice ?? 0)],
    );
  }

  await query(
    `
    INSERT INTO payments (booking_id, payment_method, amount, status, transaction_code, paid_at)
    VALUES (?, 'CASH', ?, ?, ?, CASE WHEN ? = 'PAID' THEN NOW() ELSE NULL END)
  `,
    [
      bookingId,
      totalAmount,
      payload.paid ? "PAID" : "PENDING",
      `CASH-${bookingCode}`,
      payload.paid ? "PAID" : "PENDING",
    ],
  );

  await syncTripAvailableSeatsRepo(payload.tripId);
  await createTicketHistory({
    bookingId,
    actionType: "CREATE_OFFLINE",
    newValue: payload,
  });

  return { bookingId, bookingCode };
}

export async function findAdminTicketByBookingCode(bookingCode: string) {
  const rows = await query<{ bookingId: number }>(
    `
    SELECT booking_id AS bookingId
    FROM bookings
    WHERE booking_code = ?
    LIMIT 1
  `,
    [bookingCode],
  );

  if (!rows[0]) return null;
  return await findAdminTicketDetail(rows[0].bookingId);
}

export async function findAvailableSeatsByBookingTrip(bookingId: number) {
  const booking = await findTicketBase(bookingId);
  if (!booking) throw new Error("Không tìm thấy booking");

  const rows = await query<any>(
    `
    SELECT
      sld.seat_layout_detail_id AS seatLayoutDetailId,
      sld.seat_number AS seatNumber,
      sld.floor_no AS floorNo,
      sld.row_no AS rowNo,
      sld.column_no AS columnNo,
      CASE
        WHEN bs.booking_seat_id IS NOT NULL THEN 'BOOKED'
        WHEN sh.seat_hold_id IS NOT NULL THEN 'HOLDING'
        ELSE 'AVAILABLE'
      END AS seatStatus
    FROM trips t
    INNER JOIN vehicles v ON v.vehicle_id = t.vehicle_id
    INNER JOIN seat_layout_details sld ON sld.seat_layout_id = v.seat_layout_id
    LEFT JOIN booking_seats bs
      ON bs.trip_id = t.trip_id
     AND bs.seat_layout_detail_id = sld.seat_layout_detail_id
    LEFT JOIN seat_holds sh
      ON sh.trip_id = t.trip_id
     AND sh.seat_layout_detail_id = sld.seat_layout_detail_id
     AND sh.expired_at > NOW()
    WHERE t.trip_id = ?
      AND sld.is_active = TRUE
    ORDER BY sld.floor_no, sld.row_no, sld.column_no
  `,
    [booking.trip_id],
  );

  return rows;
}

export async function getCancelTicketPreviewRepo(bookingId: number) {
  const detail = await findAdminTicketDetail(bookingId);
  if (!detail) throw new Error("Không tìm thấy booking");

  const paidAmount = detail.payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  const warnings: string[] = [];

  if (detail.bookingStatus === "CANCELLED") {
    warnings.push("Vé đã hủy trước đó");
  }

  if (detail.bookingStatus === "REFUNDED") {
    warnings.push("Vé đã hoàn tiền");
  }

  if (detail.tripStatus === "COMPLETED") {
    warnings.push(
      "Chuyến đã hoàn thành, cần kiểm tra chính sách trước khi hủy",
    );
  }

  return {
    canCancel: !["CANCELLED", "REFUNDED"].includes(detail.bookingStatus),
    reasonRequired: true,
    bookingStatus: detail.bookingStatus,
    paymentStatus: detail.paymentStatus,
    paidAmount,
    refundRequired: paidAmount > 0,
    refundAmount: paidAmount,
    seatCount: detail.seats.length,
    seatsWillBeReleased: detail.seats.map((s) => s.seatNumber),
    holdsWillBeCancelled: detail.holds.length,
    warnings,
  };
}

export async function getTripSeatAvailabilityForChangeRepo(
  tripId: number,
  bookingId: number,
) {
  return await query<any>(
    `
    SELECT
      sld.seat_layout_detail_id AS seatLayoutDetailId,
      sld.seat_number AS seatNumber,
      sld.floor_no AS floorNo,
      sld.row_no AS rowNo,
      sld.column_no AS columnNo,
      bs.booking_seat_id AS bookingSeatId,
      bs.booking_id AS ownerBookingId,
      CASE
        WHEN bs.booking_id = ? THEN 'CURRENT_BOOKING'
        WHEN bs.booking_seat_id IS NOT NULL THEN 'BOOKED'
        WHEN sh.seat_hold_id IS NOT NULL THEN 'HOLDING'
        ELSE 'AVAILABLE'
      END AS seatStatus
    FROM trips t
    INNER JOIN vehicles v ON v.vehicle_id = t.vehicle_id
    INNER JOIN seat_layout_details sld ON sld.seat_layout_id = v.seat_layout_id
    LEFT JOIN booking_seats bs
      ON bs.trip_id = t.trip_id
     AND bs.seat_layout_detail_id = sld.seat_layout_detail_id
     AND EXISTS (
       SELECT 1
       FROM bookings b
       WHERE b.booking_id = bs.booking_id
         AND b.status IN ('PENDING', 'CONFIRMED')
     )
    LEFT JOIN seat_holds sh
      ON sh.trip_id = t.trip_id
     AND sh.seat_layout_detail_id = sld.seat_layout_detail_id
     AND sh.expired_at > NOW()
     AND sh.booking_id <> ?
    WHERE t.trip_id = ?
      AND sld.is_active = TRUE
    ORDER BY sld.floor_no, sld.row_no, sld.column_no
    `,
    [bookingId, bookingId, tripId],
  );
}
export async function getTripPriceRepo(tripId: number) {
  const rows = await query<any>(
    `
    SELECT
      COALESCE(t.ticket_price, st.base_price, r.base_price, 0) AS ticketPrice
    FROM trips t
    LEFT JOIN schedule_templates st ON st.schedule_template_id = t.schedule_template_id
    LEFT JOIN routes r ON r.route_id = t.route_id
    WHERE t.trip_id = ?
    LIMIT 1
  `,
    [tripId],
  );
  if (!rows[0]) throw new Error("Không tìm thấy chuyến");
  return Number(rows[0].ticketPrice ?? 0);
}

export async function getChangeTicketPreviewRepo(
  bookingId: number,
  payload: {
    newTripId?: number;
    newSeatLayoutDetailIds?: number[];
    pickupPointId?: number | null;
    dropoffPointId?: number | null;
  },
) {
  const detail = await findAdminTicketDetail(bookingId);
  if (!detail) throw new Error("Không tìm thấy booking");

  const newTripId = payload.newTripId || detail.tripId;

  await assertSameJourney(detail.tripId, newTripId);
  await assertStopPointBelongsToTripRoute(
    newTripId,
    payload.pickupPointId,
    payload.dropoffPointId,
  );

  const oldTotalAmount = Number(detail.totalAmount ?? 0);
  const newSeatIds = payload.newSeatLayoutDetailIds?.length
    ? payload.newSeatLayoutDetailIds
    : detail.seats.map((s) => s.seatLayoutDetailId);

  const newPrice = await getTripPriceRepo(newTripId);
  const newTotalAmount = newPrice * newSeatIds.length;

  const availableSeats = await getTripSeatAvailabilityForChangeRepo(
    newTripId,
    bookingId,
  );

  const currentSeatIds = new Set(
    detail.seats.map((s) => Number(s.seatLayoutDetailId)),
  );

  const decoratedSeats = availableSeats.map((seat: any) => ({
    ...seat,
    isCurrentBookingSeat: Number(seat.ownerBookingId) === Number(bookingId),
    wasOriginalSeat: currentSeatIds.has(Number(seat.seatLayoutDetailId)),
    seatStatus:
      Number(seat.ownerBookingId) === Number(bookingId)
        ? "CURRENT_BOOKING"
        : seat.seatStatus,
  }));

  const selectedStatus = decoratedSeats.filter((s: any) =>
    newSeatIds.includes(Number(s.seatLayoutDetailId)),
  );

  const warnings: string[] = [];

  if (detail.bookingStatus === "CANCELLED") {
    warnings.push("Không thể đổi vé đã hủy");
  }

  if (detail.bookingStatus === "REFUNDED") {
    warnings.push("Không thể đổi vé đã hoàn tiền");
  }

  if (newSeatIds.length === 0) {
    warnings.push("Chưa chọn ghế mới");
  }

  const unavailable = selectedStatus.filter((s: any) => {
    if (s.seatStatus === "AVAILABLE") return false;
    if (s.seatStatus === "CURRENT_BOOKING" && newTripId === detail.tripId) {
      return false;
    }
    return true;
  });

  if (unavailable.length > 0) {
    warnings.push(`Có ${unavailable.length} ghế không khả dụng`);
  }

  const priceDifference = newTotalAmount - oldTotalAmount;
  const relatedStops = await getRelatedStopPointsByTripRouteRepo(newTripId);

  return {
    canChange: warnings.length === 0,
    oldTripId: detail.tripId,
    newTripId,
    oldSeatCount: detail.seats.length,
    newSeatCount: newSeatIds.length,
    oldTotalAmount,
    newTotalAmount,
    priceDifference,
    needExtraPayment: priceDifference > 0,
    needRefund: priceDifference < 0,
    availableSeats: decoratedSeats,
    warnings,
    pickupPoints: relatedStops.pickupPoints,
    dropoffPoints: relatedStops.dropoffPoints,
  };
}
export async function changeTicketTripRepo(
  bookingId: number,
  payload: {
    newTripId: number;
    oldBookingSeatIds: number[];
    newSeatLayoutDetailIds: number[];
    pickupPointId?: number | null;
    dropoffPointId?: number | null;
  },
) {
  const oldBooking = await findTicketBase(bookingId);
  if (!oldBooking) throw new Error("Không tìm thấy booking");

  if (!payload.oldBookingSeatIds?.length) {
    throw new Error("Chưa chọn ghế cũ cần thu hồi");
  }

  if (!payload.newSeatLayoutDetailIds?.length) {
    throw new Error("Chưa chọn ghế mới");
  }

  if (
    payload.oldBookingSeatIds.length !== payload.newSeatLayoutDetailIds.length
  ) {
    throw new Error("Số ghế mới phải bằng số ghế cũ cần đổi");
  }

  await assertSameJourney(oldBooking.trip_id, payload.newTripId);
  await assertStopPointBelongsToTripRoute(
    payload.newTripId,
    payload.pickupPointId,
    payload.dropoffPointId,
  );

  const ownedOldSeats = await query<any>(
    `
    SELECT booking_seat_id AS bookingSeatId
    FROM booking_seats
    WHERE booking_id = ?
      AND booking_seat_id IN (${payload.oldBookingSeatIds.map(() => "?").join(",")})
    `,
    [bookingId, ...payload.oldBookingSeatIds],
  );

  if (ownedOldSeats.length !== payload.oldBookingSeatIds.length) {
    throw new Error("Có ghế cũ không thuộc booking này");
  }

  const preview = await getChangeTicketPreviewRepo(bookingId, payload);
  if (!preview.canChange) {
    throw new Error(preview.warnings[0] || "Không thể đổi vé");
  }

  await assertSeatsAvailableForBooking(
    bookingId,
    payload.newTripId,
    payload.newSeatLayoutDetailIds,
    payload.oldBookingSeatIds,
  );

  await query(
    `
    DELETE FROM booking_seats
    WHERE booking_id = ?
      AND booking_seat_id IN (${payload.oldBookingSeatIds.map(() => "?").join(",")})
    `,
    [bookingId, ...payload.oldBookingSeatIds],
  );

  const newPrice = await getTripPriceRepo(payload.newTripId);

  for (const seatId of payload.newSeatLayoutDetailIds) {
    await query(
      `
      INSERT INTO booking_seats
        (booking_id, trip_id, seat_layout_detail_id, seat_price)
      VALUES (?, ?, ?, ?)
      `,
      [bookingId, payload.newTripId, seatId, newPrice],
    );
  }

  await query(
    `
    UPDATE booking_seats
    SET trip_id = ?
    WHERE booking_id = ?
    `,
    [payload.newTripId, bookingId],
  );

  await query(
    `
    UPDATE bookings
    SET
      trip_id = ?,
      pickup_point_id = ?,
      dropoff_point_id = ?,
      seat_price = ?,
      total_amount = ?,
      updated_at = NOW()
    WHERE booking_id = ?
    `,
    [
      payload.newTripId,
      payload.pickupPointId ?? oldBooking.pickup_point_id ?? null,
      payload.dropoffPointId ?? oldBooking.dropoff_point_id ?? null,
      newPrice,
      preview.newTotalAmount,
      bookingId,
    ],
  );

  await cancelTicketHoldsRepo(bookingId);
  await syncTripAvailableSeatsRepo(oldBooking.trip_id);
  await syncTripAvailableSeatsRepo(payload.newTripId);

  return {
    bookingId,
    oldTripId: oldBooking.trip_id,
    newTripId: payload.newTripId,
    priceDifference: preview.priceDifference,
  };
}
export async function undoCheckinBookingRepo(bookingId: number) {
  await query(
    `
    UPDATE booking_seats
    SET checkin_status = 'NOT_CHECKED_IN'
    WHERE booking_id = ?
  `,
    [bookingId],
  );

  return { bookingId };
}

export async function undoCheckinSeatRepo(
  bookingId: number,
  bookingSeatId: number,
) {
  await query(
    `
    UPDATE booking_seats
    SET checkin_status = 'NOT_CHECKED_IN'
    WHERE booking_id = ?
      AND booking_seat_id = ?
  `,
    [bookingId, bookingSeatId],
  );

  return { bookingId, bookingSeatId };
}

export async function getTripPassengerListRepo(tripId: number) {
  return await query<any>(
    `
    SELECT
      b.booking_id AS bookingId,
      b.booking_code AS bookingCode,
      b.contact_name AS passengerName,
      b.contact_phone AS passengerPhone,
      GROUP_CONCAT(sld.seat_number ORDER BY sld.floor_no, sld.row_no, sld.column_no SEPARATOR ', ') AS seatNumbers,
      pp.point_name AS pickupPointName,
      dp.point_name AS dropoffPointName,
      CASE
        WHEN COUNT(bs.booking_seat_id) = 0 THEN 'NOT_CHECKED_IN'
        WHEN SUM(CASE WHEN bs.checkin_status = 'CHECKED_IN' THEN 1 ELSE 0 END) = COUNT(bs.booking_seat_id) THEN 'CHECKED_IN'
        WHEN SUM(CASE WHEN bs.checkin_status = 'CHECKED_IN' THEN 1 ELSE 0 END) > 0 THEN 'PARTIAL'
        ELSE 'NOT_CHECKED_IN'
      END AS checkinStatus
    FROM bookings b
    LEFT JOIN booking_seats bs ON bs.booking_id = b.booking_id
    LEFT JOIN seat_layout_details sld ON sld.seat_layout_detail_id = bs.seat_layout_detail_id
    LEFT JOIN pickup_points pp ON pp.pickup_point_id = b.pickup_point_id
    LEFT JOIN pickup_points dp ON dp.pickup_point_id = b.dropoff_point_id
    WHERE b.trip_id = ?
      AND b.status IN ('PENDING', 'CONFIRMED')
    GROUP BY b.booking_id, pp.point_name, dp.point_name
    ORDER BY b.created_at ASC
  `,
    [tripId],
  );
}

export async function getTripSeatListRepo(tripId: number) {
  return await query<any>(
    `
    SELECT
      sld.seat_layout_detail_id AS seatLayoutDetailId,
      sld.seat_number AS seatNumber,
      sld.floor_no AS floorNo,
      sld.row_no AS rowNo,
      sld.column_no AS columnNo,
      b.booking_id AS bookingId,
      b.booking_code AS bookingCode,
      b.contact_name AS passengerName,
      b.contact_phone AS passengerPhone,
      CASE
        WHEN b.booking_id IS NOT NULL THEN 'BOOKED'
        WHEN sh.seat_hold_id IS NOT NULL THEN 'HOLDING'
        ELSE 'AVAILABLE'
      END AS seatStatus
    FROM trips t
    INNER JOIN vehicles v ON v.vehicle_id = t.vehicle_id
    INNER JOIN seat_layout_details sld ON sld.seat_layout_id = v.seat_layout_id
    LEFT JOIN booking_seats bs
      ON bs.trip_id = t.trip_id
     AND bs.seat_layout_detail_id = sld.seat_layout_detail_id
    LEFT JOIN bookings b
      ON b.booking_id = bs.booking_id
     AND b.status IN ('PENDING', 'CONFIRMED')
    LEFT JOIN seat_holds sh
      ON sh.trip_id = t.trip_id
     AND sh.seat_layout_detail_id = sld.seat_layout_detail_id
     AND sh.expired_at > NOW()
    WHERE t.trip_id = ?
      AND sld.is_active = TRUE
    ORDER BY sld.floor_no, sld.row_no, sld.column_no
  `,
    [tripId],
  );
}

export async function getTicketPaymentSummaryRepo(bookingId: number) {
  const payments = await findTicketPayments(bookingId);
  const paidAmount = payments
    .filter((p) => p.status === "PAID")
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);
  const refundedAmount = payments
    .filter((p) => p.status === "REFUNDED")
    .reduce((sum, p) => sum + Number(p.amount ?? 0), 0);

  return {
    payments,
    paidAmount,
    refundedAmount,
    latestPayment: payments[0] ?? null,
  };
}
export async function getTripStopPointsRepo(tripId: number) {
  const rows = await query<any>(
    `
    SELECT
      pp.pickup_point_id AS pickupPointId,
      pp.point_name AS pointName,
      pp.address,
      pp.point_category AS pointCategory,
      tpp.stop_type AS stopType,
      tpp.stop_order AS stopOrder,
      tpp.arrival_time AS arrivalTime,
      tpp.departure_time AS departureTime
    FROM trip_pickup_points tpp
    INNER JOIN pickup_points pp
      ON pp.pickup_point_id = tpp.pickup_point_id
    WHERE tpp.trip_id = ?
      AND tpp.is_active = TRUE
      AND pp.is_active = TRUE
    ORDER BY tpp.stop_order ASC
    `,
    [tripId],
  );

  return {
    pickupPoints: rows.filter(
      (p) => p.stopType === "PICKUP" || p.stopType === "BOTH",
    ),
    dropoffPoints: rows.filter(
      (p) => p.stopType === "DROP_OFF" || p.stopType === "BOTH",
    ),
  };
}
async function getTripRouteContext(tripId: number) {
  const rows = await query<any>(
    `
    SELECT
      t.trip_id AS tripId,
      t.route_id AS routeId,
      r.origin_city_id AS originCityId,
      oc.city_name AS originCityName,
      r.destination_city_id AS destinationCityId,
      dc.city_name AS destinationCityName,
      t.departure_datetime AS departureDatetime,
      t.status AS tripStatus
    FROM trips t
    INNER JOIN routes r ON r.route_id = t.route_id
    INNER JOIN cities oc ON oc.city_id = r.origin_city_id
    INNER JOIN cities dc ON dc.city_id = r.destination_city_id
    WHERE t.trip_id = ?
    LIMIT 1
    `,
    [tripId],
  );

  return rows[0] ?? null;
}

async function assertSameJourney(oldTripId: number, newTripId: number) {
  const oldTrip = await getTripRouteContext(oldTripId);
  const newTrip = await getTripRouteContext(newTripId);

  if (!oldTrip) throw new Error("Không tìm thấy chuyến cũ");
  if (!newTrip) throw new Error("Không tìm thấy chuyến mới");

  if (
    Number(oldTrip.originCityId) !== Number(newTrip.originCityId) ||
    Number(oldTrip.destinationCityId) !== Number(newTrip.destinationCityId)
  ) {
    throw new Error(
      "Chỉ được đổi sang chuyến cùng điểm đi và điểm đến với vé cũ",
    );
  }

  if (!["OPEN", "FULL", "RUNNING"].includes(newTrip.tripStatus)) {
    throw new Error("Chuyến mới không còn nhận đổi vé");
  }

  return { oldTrip, newTrip };
}

async function getRelatedStopPointsByTripRouteRepo(tripId: number) {
  const trip = await getTripRouteContext(tripId);
  if (!trip) throw new Error("Không tìm thấy chuyến");

  const rows = await query<any>(
    `
    SELECT
      pp.pickup_point_id AS pickupPointId,
      pp.point_name AS pointName,
      pp.address,
      pp.point_category AS pointCategory,
      pp.city_id AS cityId,
      c.city_name AS cityName,
      pp.zone_id AS zoneId,
      z.zone_name AS zoneName,
      CASE
        WHEN pp.city_id = ? THEN 'PICKUP'
        WHEN pp.city_id = ? THEN 'DROP_OFF'
        ELSE 'BOTH'
      END AS stopType
    FROM pickup_points pp
    INNER JOIN cities c ON c.city_id = pp.city_id
    INNER JOIN zones z ON z.zone_id = pp.zone_id
    WHERE pp.is_active = TRUE
      AND pp.city_id IN (?, ?)
    ORDER BY
      FIELD(pp.city_id, ?, ?),
      z.zone_name ASC,
      pp.point_name ASC
    `,
    [
      trip.originCityId,
      trip.destinationCityId,
      trip.originCityId,
      trip.destinationCityId,
      trip.originCityId,
      trip.destinationCityId,
    ],
  );

  return {
    pickupPoints: rows.filter(
      (p) => Number(p.cityId) === Number(trip.originCityId),
    ),
    dropoffPoints: rows.filter(
      (p) => Number(p.cityId) === Number(trip.destinationCityId),
    ),
  };
}

async function assertStopPointBelongsToTripRoute(
  tripId: number,
  pickupPointId?: number | null,
  dropoffPointId?: number | null,
) {
  const trip = await getTripRouteContext(tripId);
  if (!trip) throw new Error("Không tìm thấy chuyến");

  if (pickupPointId) {
    const rows = await query<any>(
      `
      SELECT pickup_point_id
      FROM pickup_points
      WHERE pickup_point_id = ?
        AND city_id = ?
        AND is_active = TRUE
      LIMIT 1
      `,
      [pickupPointId, trip.originCityId],
    );

    if (!rows[0]) {
      throw new Error("Điểm đón không thuộc city điểm đi của chuyến");
    }
  }

  if (dropoffPointId) {
    const rows = await query<any>(
      `
      SELECT pickup_point_id
      FROM pickup_points
      WHERE pickup_point_id = ?
        AND city_id = ?
        AND is_active = TRUE
      LIMIT 1
      `,
      [dropoffPointId, trip.destinationCityId],
    );

    if (!rows[0]) {
      throw new Error("Điểm trả không thuộc city điểm đến của chuyến");
    }
  }
}
export async function getOfflineTicketPreviewRepo(tripId: number) {
  const tripRows = await query<any>(
    `
SELECT
  t.trip_id AS tripId,
  CONCAT(oc.city_name, ' → ', dc.city_name) AS routeName,
  r.origin_city_id AS originCityId,
  r.destination_city_id AS destinationCityId,
  t.departure_datetime AS departureDatetime,
  t.status AS tripStatus,
  COALESCE(t.ticket_price, st.base_price, r.base_price, 0) AS ticketPrice,

  vt.type_name AS vehicleTypeName,
  v.vehicle_name AS vehicleName,
  v.license_plate AS licensePlate,
  sl.total_seats AS totalSeats
FROM trips t
INNER JOIN routes r ON r.route_id = t.route_id
INNER JOIN cities oc ON oc.city_id = r.origin_city_id
INNER JOIN cities dc ON dc.city_id = r.destination_city_id
LEFT JOIN schedule_templates st
  ON st.schedule_template_id = t.schedule_template_id
LEFT JOIN vehicles v
  ON v.vehicle_id = t.vehicle_id
LEFT JOIN vehicle_types vt
  ON vt.vehicle_type_id = v.vehicle_type_id
LEFT JOIN seat_layouts sl
  ON sl.seat_layout_id = v.seat_layout_id
WHERE t.trip_id = ?
LIMIT 1
    `,
    [tripId],
  );

  const trip = tripRows[0];
  if (!trip) throw new Error("Không tìm thấy chuyến");

  if (!["OPEN", "FULL", "RUNNING"].includes(trip.tripStatus)) {
    throw new Error("Chuyến này không còn nhận tạo vé");
  }

  const availableSeats = await query<any>(
    `
    SELECT
      sld.seat_layout_detail_id AS seatLayoutDetailId,
      sld.seat_number AS seatNumber,
      sld.floor_no AS floorNo,
      sld.row_no AS rowNo,
      sld.column_no AS columnNo,
      CASE
        WHEN bs.booking_seat_id IS NOT NULL THEN 'BOOKED'
        WHEN sh.seat_hold_id IS NOT NULL THEN 'HOLDING'
        ELSE 'AVAILABLE'
      END AS seatStatus
    FROM trips t
    INNER JOIN vehicles v ON v.vehicle_id = t.vehicle_id
    INNER JOIN seat_layout_details sld
      ON sld.seat_layout_id = v.seat_layout_id
    LEFT JOIN booking_seats bs
      ON bs.trip_id = t.trip_id
     AND bs.seat_layout_detail_id = sld.seat_layout_detail_id
     AND EXISTS (
       SELECT 1
       FROM bookings b
       WHERE b.booking_id = bs.booking_id
         AND b.status IN ('PENDING', 'CONFIRMED')
     )
    LEFT JOIN seat_holds sh
      ON sh.trip_id = t.trip_id
     AND sh.seat_layout_detail_id = sld.seat_layout_detail_id
     AND sh.expired_at > NOW()
    WHERE t.trip_id = ?
      AND sld.is_active = TRUE
    ORDER BY sld.floor_no, sld.row_no, sld.column_no
    `,
    [tripId],
  );

  const stopRows = await query<any>(
    `
    SELECT
      pp.pickup_point_id AS pickupPointId,
      pp.point_name AS pointName,
      pp.address,
      pp.city_id AS cityId,
      c.city_name AS cityName,
      pp.zone_id AS zoneId,
      z.zone_name AS zoneName,
      CASE
        WHEN pp.city_id = ? THEN 'PICKUP'
        WHEN pp.city_id = ? THEN 'DROP_OFF'
        ELSE 'BOTH'
      END AS stopType
    FROM pickup_points pp
    INNER JOIN cities c ON c.city_id = pp.city_id
    INNER JOIN zones z ON z.zone_id = pp.zone_id
    WHERE pp.is_active = TRUE
      AND pp.city_id IN (?, ?)
    ORDER BY
      FIELD(pp.city_id, ?, ?),
      z.zone_name ASC,
      pp.point_name ASC
    `,
    [
      trip.originCityId,
      trip.destinationCityId,
      trip.originCityId,
      trip.destinationCityId,
      trip.originCityId,
      trip.destinationCityId,
    ],
  );

  return {
    tripId: Number(trip.tripId),
    routeName: trip.routeName,
    departureDatetime: trip.departureDatetime,
    ticketPrice: Number(trip.ticketPrice ?? 0),

    vehicleTypeName: trip.vehicleTypeName,
    vehicleName: trip.vehicleName,
    licensePlate: trip.licensePlate,
    totalSeats: Number(trip.totalSeats ?? availableSeats.length),

    availableSeats,
    pickupPoints: stopRows.filter(
      (p) => Number(p.cityId) === Number(trip.originCityId),
    ),
    dropoffPoints: stopRows.filter(
      (p) => Number(p.cityId) === Number(trip.destinationCityId),
    ),
  };
}
