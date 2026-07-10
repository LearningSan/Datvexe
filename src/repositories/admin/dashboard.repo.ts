import { query } from "@/lib/server/mysql";
type ComparisonMetric =
  | "REVENUE"
  | "TICKETS"
  | "BOOKING_SUCCESS"
  | "CANCELLATION"
  | "OCCUPANCY";

interface ComparisonOption {
  metric: ComparisonMetric;
  label: string;
  currentValue: number;
  previousValue: number;
  changePercent: number;
}
interface DashboardFilter {
  fromDate: string;
  toDate: string;
}

type RiskSeverity = "LOW" | "MEDIUM" | "HIGH";

interface RiskItem {
  type: string;
  title: string;
  description: string;
  severity: RiskSeverity;
}

export async function findDashboardKpis(filter: DashboardFilter) {
  const sql = `
    WITH revenue AS (
      SELECT
        COALESCE(SUM(CASE 
          WHEN p.status = 'PAID' AND p.payment_method <> 'CASH'
          THEN p.amount ELSE 0 END), 0) AS onlineRevenue,

        COALESCE(SUM(CASE 
          WHEN p.status = 'PENDING' AND p.payment_method = 'CASH'
          THEN p.amount ELSE 0 END), 0) AS cashToCollect,

        COALESCE(SUM(CASE 
          WHEN p.status = 'REFUNDED'
          THEN p.amount ELSE 0 END), 0) AS refundedAmount,

        COALESCE(SUM(CASE 
          WHEN p.status = 'PAID'
          THEN p.amount ELSE 0 END), 0)
        -
        COALESCE(SUM(CASE 
          WHEN p.status = 'REFUNDED'
          THEN p.amount ELSE 0 END), 0) AS netRevenue

      FROM trips t
      LEFT JOIN bookings b ON b.trip_id = t.trip_id
      LEFT JOIN payments p ON p.booking_id = b.booking_id
      WHERE DATE(t.departure_datetime) BETWEEN ? AND ?
    ),

    stats AS (
      SELECT
        COUNT(DISTINCT b.booking_id) AS totalBookings,

        ROUND(
          COUNT(DISTINCT CASE WHEN b.status = 'CONFIRMED' THEN b.booking_id END)
          / NULLIF(COUNT(DISTINCT b.booking_id), 0) * 100,
          2
        ) AS bookingSuccessRate,

        ROUND(
          COUNT(DISTINCT CASE WHEN b.status = 'CANCELLED' THEN b.booking_id END)
          / NULLIF(COUNT(DISTINCT b.booking_id), 0) * 100,
          2
        ) AS cancellationRate,

        COUNT(DISTINCT CASE 
          WHEN b.status = 'CONFIRMED'
          THEN bs.booking_seat_id END) AS ticketsSold,

        COUNT(DISTINCT CASE WHEN b.status = 'CONFIRMED' THEN b.booking_id END) AS confirmedBookings,
        COUNT(DISTINCT CASE WHEN b.status = 'PENDING' THEN b.booking_id END) AS pendingBookings,
        COUNT(DISTINCT CASE WHEN b.status = 'CANCELLED' THEN b.booking_id END) AS cancelledBookings,
        COUNT(DISTINCT CASE WHEN p.status = 'FAILED' THEN p.payment_id END) AS failedPayments,

        COUNT(DISTINCT CASE 
          WHEN t.departure_datetime BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
            AND t.vehicle_id IS NULL
          THEN t.trip_id END) AS tripsMissingVehicle,

        COUNT(DISTINCT CASE 
          WHEN t.departure_datetime BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
            AND td.driver_id IS NULL
          THEN t.trip_id END) AS tripsMissingDriver,

        COUNT(DISTINCT CASE 
          WHEN t.departure_datetime BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 6 HOUR)
            AND sl.total_seats IS NOT NULL
            AND (sl.total_seats - t.available_seats) / sl.total_seats <= 0.3
          THEN t.trip_id END) AS upcomingLowOccupancyTrips,

        ROUND(
          COUNT(DISTINCT CASE 
            WHEN b.status = 'CONFIRMED'
            THEN bs.booking_seat_id END)
          / NULLIF(SUM(DISTINCT sl.total_seats), 0) * 100,
          2
        ) AS occupancyRate

      FROM trips t
      LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
      LEFT JOIN seat_layouts sl ON sl.seat_layout_id = v.seat_layout_id
      LEFT JOIN trip_drivers td 
        ON td.trip_id = t.trip_id 
        AND td.assigned_role = 'MAIN'
      LEFT JOIN bookings b ON b.trip_id = t.trip_id
      LEFT JOIN booking_seats bs ON bs.booking_id = b.booking_id
      LEFT JOIN payments p ON p.booking_id = b.booking_id
      WHERE DATE(t.departure_datetime) BETWEEN ? AND ?
    )

    SELECT *
    FROM stats
    CROSS JOIN revenue
  `;

  const rows = await query<any>(sql, [
    filter.fromDate,
    filter.toDate,
    filter.fromDate,
    filter.toDate,
  ]);

  const row = rows[0] || {};

  return {
    totalBookings: Number(row.totalBookings || 0),
    bookingSuccessRate: Number(row.bookingSuccessRate || 0),
    cancellationRate: Number(row.cancellationRate || 0),

    netRevenue: Number(row.netRevenue || 0),
    onlineRevenue: Number(row.onlineRevenue || 0),
    cashToCollect: Number(row.cashToCollect || 0),
    refundedAmount: Number(row.refundedAmount || 0),

    ticketsSold: Number(row.ticketsSold || 0),
    confirmedBookings: Number(row.confirmedBookings || 0),
    pendingBookings: Number(row.pendingBookings || 0),
    cancelledBookings: Number(row.cancelledBookings || 0),
    occupancyRate: Number(row.occupancyRate || 0),
    failedPayments: Number(row.failedPayments || 0),
    tripsMissingVehicle: Number(row.tripsMissingVehicle || 0),
    tripsMissingDriver: Number(row.tripsMissingDriver || 0),
    upcomingLowOccupancyTrips: Number(row.upcomingLowOccupancyTrips || 0),
  };
}

export async function findRevenueTrend(filter: DashboardFilter) {
  const sql = `
  SELECT
  DATE(t.departure_datetime) AS date,

  COALESCE(SUM(CASE 
    WHEN p.status = 'PAID'
    THEN p.amount ELSE 0 END), 0) AS grossRevenue,

  COALESCE(SUM(CASE 
    WHEN p.status = 'REFUNDED'
    THEN p.amount ELSE 0 END), 0) AS refundedAmount,

  COALESCE(SUM(CASE 
    WHEN p.status = 'PAID'
    THEN p.amount ELSE 0 END), 0)
  -
  COALESCE(SUM(CASE 
    WHEN p.status = 'REFUNDED'
    THEN p.amount ELSE 0 END), 0) AS netRevenue

FROM trips t
LEFT JOIN bookings b ON b.trip_id = t.trip_id
LEFT JOIN payments p ON p.booking_id = b.booking_id

WHERE DATE(t.departure_datetime) BETWEEN ? AND ?

GROUP BY DATE(t.departure_datetime)
ORDER BY date ASC
  `;

  return await query<any>(sql, [filter.fromDate, filter.toDate]);
}

export async function findPaymentSummary(filter: DashboardFilter) {
  const sql = `
    SELECT
      payment_method AS method,
      SUM(CASE WHEN status = 'PAID' THEN 1 ELSE 0 END) AS paid,
      SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
      SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failed,
      SUM(CASE WHEN status = 'REFUNDED' THEN 1 ELSE 0 END) AS refunded
    FROM payments
    WHERE DATE(created_at) BETWEEN ? AND ?
    GROUP BY payment_method
    ORDER BY paid DESC
  `;

  return await query<any>(sql, [filter.fromDate, filter.toDate]);
}

export async function findBookingStatusSummary(filter: DashboardFilter) {
  const sql = `
    SELECT 
      status, 
      COUNT(*) AS total
    FROM bookings
    WHERE DATE(created_at) BETWEEN ? AND ?
    GROUP BY status
  `;

  return await query<any>(sql, [filter.fromDate, filter.toDate]);
}

export async function findTopRoutes(filter: DashboardFilter) {
  const sql = `
    SELECT
      r.route_id AS routeId,
      CONCAT(oc.city_name, ' - ', dc.city_name) AS routeName,

      COUNT(DISTINCT bs.booking_seat_id) AS ticketsSold,

      COALESCE(SUM(CASE 
        WHEN p.status = 'PAID'
        THEN p.amount ELSE 0 END), 0) AS revenue,

      ROUND(
        COUNT(DISTINCT bs.booking_seat_id)
        / NULLIF(SUM(DISTINCT sl.total_seats), 0) * 100,
        2
      ) AS occupancyRate

    FROM routes r
    INNER JOIN cities oc ON oc.city_id = r.origin_city_id
    INNER JOIN cities dc ON dc.city_id = r.destination_city_id
    INNER JOIN trips t ON t.route_id = r.route_id
    LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
    LEFT JOIN seat_layouts sl ON sl.seat_layout_id = v.seat_layout_id
    LEFT JOIN bookings b 
      ON b.trip_id = t.trip_id 
      AND b.status = 'CONFIRMED'
    LEFT JOIN booking_seats bs ON bs.booking_id = b.booking_id
    LEFT JOIN payments p ON p.booking_id = b.booking_id

    WHERE DATE(t.departure_datetime) BETWEEN ? AND ?

    GROUP BY r.route_id, oc.city_name, dc.city_name
    ORDER BY revenue DESC, ticketsSold DESC
    LIMIT 5
  `;

  return await query<any>(sql, [filter.fromDate, filter.toDate]);
}

export async function findUpcomingTrips() {
  const sql = `
    SELECT
      t.trip_id AS tripId,
      CONCAT(oc.city_name, ' - ', dc.city_name) AS routeName,
      t.departure_datetime AS departureTime,
      v.license_plate AS licensePlate,
      u.full_name AS driverName,
      t.available_seats AS availableSeats,
      sl.total_seats AS totalSeats,
      t.status,

      CASE
        WHEN t.vehicle_id IS NULL THEN 'Chưa gán xe'
        WHEN td.driver_id IS NULL THEN 'Chưa gán tài xế'
        WHEN sl.total_seats IS NOT NULL 
          AND t.available_seats / sl.total_seats <= 0.1 
        THEN 'Gần hết ghế'
        ELSE NULL
      END AS warning

    FROM trips t
    INNER JOIN routes r ON r.route_id = t.route_id
    INNER JOIN cities oc ON oc.city_id = r.origin_city_id
    INNER JOIN cities dc ON dc.city_id = r.destination_city_id
    LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
    LEFT JOIN seat_layouts sl ON sl.seat_layout_id = v.seat_layout_id
    LEFT JOIN trip_drivers td 
      ON td.trip_id = t.trip_id 
      AND td.assigned_role = 'MAIN'
    LEFT JOIN drivers d ON d.driver_id = td.driver_id
    LEFT JOIN users u ON u.user_id = d.user_id

    WHERE t.departure_datetime >= NOW()

    ORDER BY t.departure_datetime ASC
    LIMIT 8
  `;

  return await query<any>(sql);
}

export async function findRiskItems(): Promise<RiskItem[]> {
  const pendingSql = `
    SELECT COUNT(*) AS total
    FROM bookings
    WHERE status = 'PENDING'
      AND created_at < DATE_SUB(NOW(), INTERVAL 15 MINUTE)
  `;

  const failedPaymentSql = `
    SELECT COUNT(*) AS total
    FROM payments
    WHERE status = 'FAILED'
      AND created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
  `;

  const missingVehicleSql = `
    SELECT COUNT(*) AS total
    FROM trips
    WHERE departure_datetime BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
      AND vehicle_id IS NULL
  `;

  const missingDriverSql = `
    SELECT COUNT(*) AS total
    FROM trips t
    LEFT JOIN trip_drivers td 
      ON td.trip_id = t.trip_id 
      AND td.assigned_role = 'MAIN'
    WHERE t.departure_datetime BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
      AND td.driver_id IS NULL
  `;

  const [pendingRows, failedRows, vehicleRows, driverRows] = await Promise.all([
    query<any>(pendingSql),
    query<any>(failedPaymentSql),
    query<any>(missingVehicleSql),
    query<any>(missingDriverSql),
  ]);

  const risks: RiskItem[] = [];

  const pending = Number(pendingRows[0]?.total || 0);
  const failed = Number(failedRows[0]?.total || 0);
  const missingVehicle = Number(vehicleRows[0]?.total || 0);
  const missingDriver = Number(driverRows[0]?.total || 0);

  if (pending > 0) {
    risks.push({
      type: "BOOKING_PENDING",
      title: `${pending} chờ đặt vé quá 15 phút`,
      description: "Cần kiểm tra giữ chỗ hoặc hủy tự động để tránh chiếm ghế.",
      severity: "HIGH",
    });
  }

  if (failed > 0) {
    risks.push({
      type: "PAYMENT_FAILED",
      title: `${failed} giao dịch thất bại trong 24 giờ`,
      description: "Cần kiểm tra lỗi thanh toán hoặc hỗ trợ khách đặt lại vé.",
      severity: "MEDIUM",
    });
  }

  if (missingVehicle > 0) {
    risks.push({
      type: "MISSING_VEHICLE",
      title: `${missingVehicle} chuyến sắp chạy chưa gán xe`,
      description: "Cần điều phối xe trước giờ khởi hành.",
      severity: "HIGH",
    });
  }

  if (missingDriver > 0) {
    risks.push({
      type: "MISSING_DRIVER",
      title: `${missingDriver} chuyến sắp chạy chưa gán tài xế`,
      description: "Cần phân công tài xế để tránh trễ chuyến.",
      severity: "HIGH",
    });
  }

  return risks;
}

export async function findReviewSummary(filter: DashboardFilter) {
  const sql = `
    SELECT
      ROUND(AVG(r.rating), 1) AS averageRating,
      COUNT(*) AS totalReviews
    FROM reviews r
    WHERE DATE(r.created_at) BETWEEN ? AND ?
  `;

  const rows = await query<any>(sql, [filter.fromDate, filter.toDate]);
  const row = rows[0] || {};

  return {
    averageRating: Number(row.averageRating || 0),
    totalReviews: Number(row.totalReviews || 0),
  };
}

export async function findLatestReviews(filter: DashboardFilter) {
  const sql = `
    SELECT
      u.full_name AS customerName,
      r.rating,
      r.comment,
      r.created_at AS createdAt
    FROM reviews r
    INNER JOIN users u ON u.user_id = r.user_id
    WHERE DATE(r.created_at) BETWEEN ? AND ?
    ORDER BY r.created_at DESC
    LIMIT 5
  `;

  return await query<any>(sql, [filter.fromDate, filter.toDate]);
}
export async function findPaymentMethodChart(filter: DashboardFilter) {
  const sql = `
    SELECT
      payment_method AS method,
      COUNT(*) AS transactionCount,
      COALESCE(SUM(CASE WHEN status = 'PAID' THEN amount ELSE 0 END), 0) AS revenue
    FROM payments
    WHERE DATE(created_at) BETWEEN ? AND ?
    GROUP BY payment_method
    ORDER BY revenue DESC, transactionCount DESC
  `;

  return await query<any>(sql, [filter.fromDate, filter.toDate]);
}

export async function findTripStatusChart(filter: DashboardFilter) {
  const sql = `
    SELECT
      status,
      COUNT(*) AS count
    FROM trips
    WHERE DATE(departure_datetime) BETWEEN ? AND ?
    GROUP BY status
    ORDER BY count DESC
  `;

  return await query<any>(sql, [filter.fromDate, filter.toDate]);
}

export async function findReviewRatingChart(filter: DashboardFilter) {
  const sql = `
    SELECT
      rating,
      COUNT(*) AS count
    FROM reviews
    WHERE DATE(created_at) BETWEEN ? AND ?
    GROUP BY rating
    ORDER BY rating DESC
  `;

  const rows = await query<any>(sql, [filter.fromDate, filter.toDate]);

  const ratingMap = new Map<number, number>();

  rows.forEach((row: any) => {
    ratingMap.set(Number(row.rating), Number(row.count));
  });

  return [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: ratingMap.get(rating) || 0,
  }));
}

export async function findComparisonOptions(
  filter: DashboardFilter,
): Promise<ComparisonOption[]> {
  const current = await getComparisonBase(filter.fromDate, filter.toDate);

  const diffRows = await query<any>(`SELECT DATEDIFF(?, ?) + 1 AS totalDays`, [
    filter.toDate,
    filter.fromDate,
  ]);

  const totalDays = Number(diffRows[0]?.totalDays || 1);

  const previousFromRows = await query<any>(
    `SELECT DATE_SUB(?, INTERVAL ? DAY) AS fromDate`,
    [filter.fromDate, totalDays],
  );

  const previousToRows = await query<any>(
    `SELECT DATE_SUB(?, INTERVAL ? DAY) AS toDate`,
    [filter.toDate, totalDays],
  );

  const previous = await getComparisonBase(
    previousFromRows[0].fromDate,
    previousToRows[0].toDate,
  );

  const result: ComparisonOption[] = [
    {
      metric: "REVENUE",
      label: "Doanh thu thuần",
      currentValue: current.netRevenue,
      previousValue: previous.netRevenue,
      changePercent: calcChange(current.netRevenue, previous.netRevenue),
    },
    {
      metric: "TICKETS",
      label: "Vé đã bán",
      currentValue: current.ticketsSold,
      previousValue: previous.ticketsSold,
      changePercent: calcChange(current.ticketsSold, previous.ticketsSold),
    },
    {
      metric: "BOOKING_SUCCESS",
      label: "Tỷ lệ đặt thành công",
      currentValue: current.bookingSuccessRate,
      previousValue: previous.bookingSuccessRate,
      changePercent: calcChange(
        current.bookingSuccessRate,
        previous.bookingSuccessRate,
      ),
    },
    {
      metric: "CANCELLATION",
      label: "Tỷ lệ hủy",
      currentValue: current.cancellationRate,
      previousValue: previous.cancellationRate,
      changePercent: calcChange(
        current.cancellationRate,
        previous.cancellationRate,
      ),
    },
    {
      metric: "OCCUPANCY",
      label: "Tỷ lệ lấp đầy",
      currentValue: current.occupancyRate,
      previousValue: previous.occupancyRate,
      changePercent: calcChange(current.occupancyRate, previous.occupancyRate),
    },
  ];

  return result;
}
async function getComparisonBase(fromDate: string, toDate: string) {
  const sql = `
    SELECT
      COALESCE(SUM(CASE WHEN p.status = 'PAID' THEN p.amount ELSE 0 END), 0)
      -
      COALESCE(SUM(CASE WHEN p.status = 'REFUNDED' THEN p.amount ELSE 0 END), 0) AS netRevenue,

      COUNT(DISTINCT CASE WHEN b.status = 'CONFIRMED' THEN bs.booking_seat_id END) AS ticketsSold,

      ROUND(
        COUNT(DISTINCT CASE WHEN b.status = 'CONFIRMED' THEN b.booking_id END)
        / NULLIF(COUNT(DISTINCT b.booking_id), 0) * 100,
        2
      ) AS bookingSuccessRate,

      ROUND(
        COUNT(DISTINCT CASE WHEN b.status = 'CANCELLED' THEN b.booking_id END)
        / NULLIF(COUNT(DISTINCT b.booking_id), 0) * 100,
        2
      ) AS cancellationRate,

      ROUND(
        COUNT(DISTINCT CASE WHEN b.status = 'CONFIRMED' THEN bs.booking_seat_id END)
        / NULLIF(SUM(DISTINCT sl.total_seats), 0) * 100,
        2
      ) AS occupancyRate

    FROM trips t
    LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
    LEFT JOIN seat_layouts sl ON sl.seat_layout_id = v.seat_layout_id
    LEFT JOIN bookings b ON b.trip_id = t.trip_id
    LEFT JOIN booking_seats bs ON bs.booking_id = b.booking_id
    LEFT JOIN payments p ON p.booking_id = b.booking_id
    WHERE DATE(t.departure_datetime) BETWEEN ? AND ?
  `;

  const rows = await query<any>(sql, [fromDate, toDate]);
  const row = rows[0] || {};

  return {
    netRevenue: Number(row.netRevenue || 0),
    ticketsSold: Number(row.ticketsSold || 0),
    bookingSuccessRate: Number(row.bookingSuccessRate || 0),
    cancellationRate: Number(row.cancellationRate || 0),
    occupancyRate: Number(row.occupancyRate || 0),
  };
}

export async function findOccupancyByTimeSlot(filter: DashboardFilter) {
  const sql = `
    SELECT
      CASE
        WHEN HOUR(t.departure_datetime) BETWEEN 0 AND 5 THEN '00:00 - 05:59'
        WHEN HOUR(t.departure_datetime) BETWEEN 6 AND 11 THEN '06:00 - 11:59'
        WHEN HOUR(t.departure_datetime) BETWEEN 12 AND 17 THEN '12:00 - 17:59'
        ELSE '18:00 - 23:59'
      END AS timeSlot,

      COUNT(DISTINCT t.trip_id) AS totalTrips,

      ROUND(
        COUNT(DISTINCT bs.booking_seat_id)
        / NULLIF(SUM(DISTINCT sl.total_seats), 0) * 100,
        2
      ) AS occupancyRate

    FROM trips t
    LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
    LEFT JOIN seat_layouts sl ON sl.seat_layout_id = v.seat_layout_id
    LEFT JOIN bookings b 
      ON b.trip_id = t.trip_id
      AND b.status = 'CONFIRMED'
    LEFT JOIN booking_seats bs ON bs.booking_id = b.booking_id

    WHERE DATE(t.departure_datetime) BETWEEN ? AND ?

    GROUP BY timeSlot
    ORDER BY MIN(HOUR(t.departure_datetime)) ASC
  `;

  return await query<any>(sql, [filter.fromDate, filter.toDate]);
}

export async function findLowPerformanceTrips(filter: DashboardFilter) {
  const sql = `
    SELECT
      t.trip_id AS tripId,
      CONCAT(oc.city_name, ' - ', dc.city_name) AS routeName,
      t.departure_datetime AS departureTime,

      COUNT(DISTINCT bs.booking_seat_id) AS bookedSeats,

      COALESCE(sl.total_seats, 0) AS totalSeats,

      ROUND(
        COUNT(DISTINCT bs.booking_seat_id)
        / NULLIF(sl.total_seats, 0) * 100,
        2
      ) AS occupancyRate,

      COALESCE(SUM(CASE WHEN p.status = 'PAID' THEN p.amount ELSE 0 END), 0) AS revenue

    FROM trips t
    INNER JOIN routes r ON r.route_id = t.route_id
    INNER JOIN cities oc ON oc.city_id = r.origin_city_id
    INNER JOIN cities dc ON dc.city_id = r.destination_city_id
    LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
    LEFT JOIN seat_layouts sl ON sl.seat_layout_id = v.seat_layout_id
    LEFT JOIN bookings b 
      ON b.trip_id = t.trip_id
      AND b.status = 'CONFIRMED'
    LEFT JOIN booking_seats bs ON bs.booking_id = b.booking_id
    LEFT JOIN payments p ON p.booking_id = b.booking_id

    WHERE DATE(t.departure_datetime) BETWEEN ? AND ?
      AND sl.total_seats IS NOT NULL

    GROUP BY
      t.trip_id,
      t.departure_datetime,
      oc.city_name,
      dc.city_name,
      sl.total_seats

    HAVING occupancyRate <= 30

    ORDER BY occupancyRate ASC, revenue ASC

    LIMIT 5
  `;

  return await query<any>(sql, [filter.fromDate, filter.toDate]);
}

function calcChange(current: number, previous: number) {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }

  return Number((((current - previous) / previous) * 100).toFixed(2));
}
export async function findTopSellingRoutes(filter: DashboardFilter) {
  const sql = `
    SELECT
      r.route_id AS routeId,
      CONCAT(oc.city_name, ' - ', dc.city_name) AS routeName,
      COUNT(DISTINCT bs.booking_seat_id) AS ticketsSold,
      COALESCE(SUM(CASE WHEN p.status = 'PAID' THEN p.amount ELSE 0 END), 0) AS revenue,
      ROUND(
        COUNT(DISTINCT bs.booking_seat_id)
        / NULLIF(SUM(DISTINCT sl.total_seats), 0) * 100,
        2
      ) AS occupancyRate
    FROM routes r
    INNER JOIN cities oc ON oc.city_id = r.origin_city_id
    INNER JOIN cities dc ON dc.city_id = r.destination_city_id
    INNER JOIN trips t ON t.route_id = r.route_id
    LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
    LEFT JOIN seat_layouts sl ON sl.seat_layout_id = v.seat_layout_id
    LEFT JOIN bookings b 
      ON b.trip_id = t.trip_id 
      AND b.status = 'CONFIRMED'
    LEFT JOIN booking_seats bs ON bs.booking_id = b.booking_id
    LEFT JOIN payments p ON p.booking_id = b.booking_id
    WHERE DATE(t.departure_datetime) BETWEEN ? AND ?
    GROUP BY r.route_id, oc.city_name, dc.city_name
    ORDER BY ticketsSold DESC, revenue DESC
    LIMIT 5
  `;

  return await query<any>(sql, [filter.fromDate, filter.toDate]);
}
export async function findTimeSlotInsight(filter: DashboardFilter) {
  const sql = `
    SELECT
      CASE
        WHEN HOUR(t.departure_datetime) BETWEEN 0 AND 5 THEN 'Đêm muộn 00:00 - 05:59'
        WHEN HOUR(t.departure_datetime) BETWEEN 6 AND 10 THEN 'Sáng 06:00 - 10:59'
        WHEN HOUR(t.departure_datetime) BETWEEN 11 AND 14 THEN 'Trưa 11:00 - 14:59'
        WHEN HOUR(t.departure_datetime) BETWEEN 15 AND 18 THEN 'Chiều 15:00 - 18:59'
        ELSE 'Tối 19:00 - 23:59'
      END AS timeSlot,

      COUNT(DISTINCT t.trip_id) AS totalTrips,
      COUNT(DISTINCT bs.booking_seat_id) AS bookedSeats,
      COALESCE(SUM(DISTINCT sl.total_seats), 0) AS totalSeats,

      ROUND(
        COUNT(DISTINCT bs.booking_seat_id)
        / NULLIF(SUM(DISTINCT sl.total_seats), 0) * 100,
        2
      ) AS occupancyRate

    FROM trips t
    LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
    LEFT JOIN seat_layouts sl ON sl.seat_layout_id = v.seat_layout_id
    LEFT JOIN bookings b 
      ON b.trip_id = t.trip_id 
      AND b.status = 'CONFIRMED'
    LEFT JOIN booking_seats bs ON bs.booking_id = b.booking_id

    WHERE DATE(t.departure_datetime) BETWEEN ? AND ?

    GROUP BY timeSlot
    ORDER BY MIN(HOUR(t.departure_datetime)) ASC
  `;

  const rows = await query<any>(sql, [filter.fromDate, filter.toDate]);

  return rows.map((row: any) => {
    const occupancyRate = Number(row.occupancyRate || 0);

    let recommendation = "Duy trì lịch chạy hiện tại";

    if (occupancyRate >= 80) {
      recommendation = "Nhu cầu cao, có thể cân nhắc tăng chuyến";
    } else if (occupancyRate <= 30) {
      recommendation = "Nhu cầu thấp, cần xem xét giảm chuyến hoặc khuyến mãi";
    } else if (occupancyRate <= 50) {
      recommendation = "Hiệu suất trung bình, cần theo dõi thêm";
    }

    return {
      timeSlot: row.timeSlot,
      totalTrips: Number(row.totalTrips || 0),
      bookedSeats: Number(row.bookedSeats || 0),
      totalSeats: Number(row.totalSeats || 0),
      occupancyRate,
      recommendation,
    };
  });
}
export async function findRoutePerformance(filter: {
  originCityId: number;
  destinationCityId: number;
  fromDate: string;
  toDate: string;
}) {
  const tripsSql = `
    SELECT
      t.trip_id AS tripId,
      t.departure_datetime AS departureTime,
      CONCAT(oc.city_name, ' - ', dc.city_name) AS routeName,

      COUNT(DISTINCT bs.booking_seat_id) AS bookedSeats,

      COALESCE(sl.total_seats, 0) AS totalSeats,

      ROUND(
        COUNT(DISTINCT bs.booking_seat_id)
        / NULLIF(sl.total_seats, 0) * 100,
        2
      ) AS occupancyRate,

      COALESCE(SUM(CASE 
        WHEN p.status = 'PAID'
        THEN p.amount ELSE 0 END), 0) AS revenue

    FROM trips t
    INNER JOIN routes r ON r.route_id = t.route_id
    INNER JOIN cities oc ON oc.city_id = r.origin_city_id
    INNER JOIN cities dc ON dc.city_id = r.destination_city_id

    LEFT JOIN vehicles v ON v.vehicle_id = t.vehicle_id
    LEFT JOIN seat_layouts sl ON sl.seat_layout_id = v.seat_layout_id

    LEFT JOIN bookings b 
      ON b.trip_id = t.trip_id
      AND b.status = 'CONFIRMED'

    LEFT JOIN booking_seats bs ON bs.booking_id = b.booking_id
    LEFT JOIN payments p ON p.booking_id = b.booking_id

    WHERE r.origin_city_id = ?
      AND r.destination_city_id = ?
      AND DATE(t.departure_datetime) BETWEEN ? AND ?

    GROUP BY 
      t.trip_id,
      t.departure_datetime,
      oc.city_name,
      dc.city_name,
      sl.total_seats

    ORDER BY t.departure_datetime ASC
  `;

  const trips = await query<any>(tripsSql, [
    filter.originCityId,
    filter.destinationCityId,
    filter.fromDate,
    filter.toDate,
  ]);

  const routeName = trips[0]?.routeName || "Tuyến chưa có dữ liệu";

  const totalTrips = trips.length;

  const totalBookedSeats = trips.reduce(
    (sum: number, item: any) => sum + Number(item.bookedSeats || 0),
    0,
  );

  const totalSeats = trips.reduce(
    (sum: number, item: any) => sum + Number(item.totalSeats || 0),
    0,
  );

  const revenue = trips.reduce(
    (sum: number, item: any) => sum + Number(item.revenue || 0),
    0,
  );

  return {
    summary: {
      routeName,
      totalTrips,
      totalBookedSeats,
      totalSeats,
      occupancyRate:
        totalSeats > 0
          ? Number(((totalBookedSeats / totalSeats) * 100).toFixed(2))
          : 0,
      revenue,
    },

    trips: trips.map((item: any) => ({
      tripId: Number(item.tripId),
      departureTime: item.departureTime,
      bookedSeats: Number(item.bookedSeats || 0),
      totalSeats: Number(item.totalSeats || 0),
      occupancyRate: Number(item.occupancyRate || 0),
      revenue: Number(item.revenue || 0),
    })),
  };
}
