"use client";

import { useState } from "react";
import styles from "./DashboardContainer.module.css";
import { useDashboard } from "@/hooks/admin/useDashboard";

import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";
import BlockSkeleton from "@/components/common/BlockSkeleton";

import {
  Ticket,
  Banknote,
  TrendingUp,
  Wallet,
  RotateCcw,
  User,
} from "lucide-react";
import KpiCard from "./kpi/KpiCard";
import MiniKpi from "./kpi/MiniKpi";
import Card from "./card/Card";
import RevenueChart from "./charts/RevenueChart";
import PaymentSummary from "./payment/PaymentSummary";
import PaymentMethodChart from "./payment/PaymentMethodChart";
import TripStatusChart from "./trip/TripStatusChart";
import RouteRevenueChart from "./route/RouteRevenueChart";
import RouteSellingChart from "./route/RouteSellingChart";
import RoutePerformanceSection from "./route/RoutePerformanceSection";
import ComparisonOptions from "./analytics/ComparisonOptions";
import TimeSlotInsight from "./insight/TimeSlotInsight";
import ReviewRatingChart from "./customer/ReviewRatingChart";
import RiskCenter from "./risk/RiskCenter";
import {
  formatDateTime,
  getLocalDateString,
  formatMoneyCompact,
} from "./utils/dashboardFormat";

export default function DashboardContainer() {
  const todayStr = getLocalDateString(new Date());

  const [fromDate, setFromDate] = useState(todayStr);
  const [toDate, setToDate] = useState(todayStr);

  const [preset, setPreset] = useState<
    "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH" | "CUSTOM"
  >("TODAY");

  const { data, isLoading } = useDashboard(fromDate, toDate);

  const applyPreset = (
    type: "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH",
  ) => {
    const now = new Date();
    const end = getLocalDateString(now);

    switch (type) {
      case "TODAY": {
        setFromDate(end);
        setToDate(end);
        break;
      }

      case "LAST_7_DAYS": {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        setFromDate(getLocalDateString(d));
        setToDate(end);
        break;
      }

      case "LAST_30_DAYS": {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        setFromDate(getLocalDateString(d));
        setToDate(end);
        break;
      }

      case "THIS_MONTH": {
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        setFromDate(getLocalDateString(firstDay));
        setToDate(end);
        break;
      }
    }

    setPreset(type);
  };

  if (isLoading) return <BlockSkeleton height={800} />;

  if (!data) {
    return (
      <div className={styles.emptyState}>
        Không tìm thấy dữ liệu vận hành. Vui lòng thử lại sau.
      </div>
    );
  }

  return (
    <BlockErrorBoundary fallback={<BlockSkeleton height={800} />}>
      <div className={styles.dashboard}>
        <header className={styles.header}>
          <div className={styles.headerTitle}>
            <h1>Dashboard Vận Hành</h1>
            <p>
              Theo dõi doanh thu, thanh toán, hiệu suất tuyến, chuyến xe và phản
              hồi khách hàng.
            </p>
          </div>

          <div className={styles.filterContainer}>
            <div className={styles.quickFilters}>
              {(
                ["TODAY", "LAST_7_DAYS", "LAST_30_DAYS", "THIS_MONTH"] as const
              ).map((item) => (
                <button
                  key={item}
                  className={
                    preset === item ? styles.activeBtn : styles.quickBtn
                  }
                  onClick={() => applyPreset(item)}
                >
                  {item === "TODAY" && "Hôm nay"}
                  {item === "LAST_7_DAYS" && "7 ngày"}
                  {item === "LAST_30_DAYS" && "30 ngày"}
                  {item === "THIS_MONTH" && "Tháng này"}
                </button>
              ))}
            </div>

            <div className={styles.dateFilterGroup}>
              <div className={styles.dateField}>
                <span>Từ</span>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => {
                    setPreset("CUSTOM");
                    setFromDate(e.target.value);
                  }}
                />
              </div>

              <div className={styles.dateField}>
                <span>Đến</span>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => {
                    setPreset("CUSTOM");
                    setToDate(e.target.value);
                  }}
                />
              </div>
            </div>
          </div>
        </header>

        <section className={styles.kpiGrid}>
          <KpiCard
            icon={<TrendingUp size={22} />}
            title="Doanh thu thuần"
            value={formatMoneyCompact(data.kpis?.netRevenue)}
            tone="blue"
          />

          <KpiCard
            icon={<Wallet size={22} />}
            title="Tiền online đã thu"
            value={formatMoneyCompact(data.kpis?.onlineRevenue)}
            tone="green"
          />

          <KpiCard
            icon={<Banknote size={22} />}
            title="Tiền mặt cần thu"
            value={formatMoneyCompact(data.kpis?.cashToCollect)}
            tone="yellow"
          />

          <KpiCard
            icon={<Ticket size={22} />}
            title="Vé đã bán"
            value={(data.kpis?.ticketsSold ?? 0).toLocaleString("vi-VN")}
            tone="purple"
          />

          <KpiCard
            icon={<RotateCcw size={22} />}
            title="Tổng tiền hoàn"
            value={formatMoneyCompact(data.kpis?.refundedAmount)}
            tone="red"
          />
        </section>

        <section className={styles.kpiGridSmall}>
          <MiniKpi
            title="Tỷ lệ đặt thành công"
            value={`${data.kpis?.bookingSuccessRate ?? 0}%`}
            type="success"
          />

          <MiniKpi
            title="Tỷ lệ hủy"
            value={`${data.kpis?.cancellationRate ?? 0}%`}
            type="warning"
          />

          <MiniKpi
            title="Đang chờ đặt vé"
            value={data.kpis?.pendingBookings}
            type="warning"
          />

          <MiniKpi
            title="Thanh toán thất bại"
            value={data.kpis?.failedPayments}
            type="danger"
          />

         
        </section>

        <section className={styles.rowTwo}>
          <Card title="Xu hướng doanh thu & hoàn tiền" variant="primary">
            <RevenueChart data={data.revenueTrend ?? []} />
          </Card>

          <Card title="Trạng thái thanh toán">
            <PaymentSummary data={data.paymentSummary ?? []} />
          </Card>
        </section>

        <section className={styles.rowChartsThree}>
          <Card title="Cơ cấu phương thức thanh toán">
            <PaymentMethodChart data={data.paymentMethodChart ?? []} />
          </Card>

          <Card title="Trạng thái chuyến xe">
            <TripStatusChart data={data.tripStatusChart ?? []} />
          </Card>

          <Card title="Hiệu quả theo khung giờ">
            <TimeSlotInsight data={data.timeSlotInsight ?? []} />
          </Card>
        </section>

        <section className={styles.routeBusinessGrid}>
          <Card title="Top tuyến doanh thu">
            <RouteRevenueChart data={data.topRoutes ?? []} />
          </Card>

          <Card title="Top tuyến bán chạy">
            <RouteSellingChart data={data.topSellingRoutes ?? []} />
          </Card>


        </section>

        <RoutePerformanceSection fromDate={fromDate} toDate={toDate} />

        <section className={styles.rowThree}>
          <Card title="Chuyến xe sắp khởi hành cần giám sát">
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Mã số</th>
                    <th>Tuyến đường</th>
                    <th>Giờ xuất bến</th>
                    <th>Biển số xe</th>
                    <th>Tài xế</th>
                    <th>Sức chứa</th>
                    <th>Tình trạng</th>
                  </tr>
                </thead>

                <tbody>
                  {(data.upcomingTrips ?? []).map((trip: any) => (
                    <tr key={`upcoming-${trip.tripId}`}>
                      <td className={styles.tripId}>#{trip.tripId}</td>

                      <td className={styles.routeName}>{trip.routeName}</td>

                      <td className={styles.timeCell}>
                        {formatDateTime(trip.departureTime)}
                      </td>

                      <td>
                        {trip.licensePlate ? (
                          <span className={styles.plateBadge}>
                            {trip.licensePlate}
                          </span>
                        ) : (
                          <span
                            className={`${styles.unassigned} ${styles.dangerText}`}
                          >
                            Chưa điều xe
                          </span>
                        )}
                      </td>

                      <td>
                        {trip.driverName ? (
                          <div className={styles.driverCell}>
                            <User size={14} />
                            <span>{trip.driverName}</span>
                          </div>
                        ) : (
                          <span
                            className={`${styles.unassigned} ${styles.dangerText}`}
                          >
                            Chưa gán tài
                          </span>
                        )}
                      </td>

                      <td className={styles.seatCell}>
                        {trip.totalSeats ? (
                          <div className={styles.seatContainer}>
                            <span className={styles.seatCount}>
                              {trip.totalSeats - trip.availableSeats}/
                              {trip.totalSeats}
                            </span>

                            <div className={styles.miniProgressTrack}>
                              <div
                                className={styles.miniProgressBar}
                                style={{
                                  width: `${((trip.totalSeats - trip.availableSeats) / trip.totalSeats) * 100}%`,
                                }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className={styles.unassigned}>N/A</span>
                        )}
                      </td>

                      <td>
                        {trip.warning ? (
                          <span className={styles.warningBadge}>
                            {trip.warning}
                          </span>
                        ) : (
                          <span className={styles.okBadge}>Ổn định</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </section>

        <section className={styles.rowAnalytics}>
          <Card title="So sánh kỳ trước" variant="soft">
            <ComparisonOptions data={data.comparisonOptions ?? []} />
          </Card>

          <Card title="Trung tâm xử lý rủi ro" variant="danger">
            <RiskCenter data={data.riskItems ?? []} />
          </Card>
        </section>

        <section className={styles.customerGrid}>
          <Card title="Khách hàng & mức độ hài lòng">
            <div className={styles.customerInsightGrid}>
              <div className={styles.ratingBox}>
                <div className={styles.ratingBig}>
                  <strong>{data.reviewSummary?.averageRating ?? "0"}</strong>
                  <span>/5</span>
                </div>

                <div className={styles.starsRow}>⭐⭐⭐⭐⭐</div>

                <span className={styles.ratingCount}>
                  {data.reviewSummary?.totalReviews ?? 0} lượt phản hồi
                </span>
              </div>

              <ReviewRatingChart data={data.reviewRatingChart ?? []} />
            </div>
          </Card>

          <Card title="Ý kiến phản hồi mới nhất">
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Hành khách</th>
                    <th>Đánh giá</th>
                    <th>Nội dung bình luận</th>
                  </tr>
                </thead>

                <tbody>
                  {(data.latestReviews ?? []).map(
                    (review: any, index: number) => (
                      <tr key={`review-${index}`}>
                        <td className={styles.customerName}>
                          {review.customerName}
                        </td>

                        <td>
                          <span className={styles.starBadge}>
                            {review.rating} ★
                          </span>
                        </td>

                        <td
                          className={styles.commentText}
                          title={review.comment ?? ""}
                        >
                          {review.comment ??
                            "Hành khách không để lại bình luận"}
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </section>
      </div>
    </BlockErrorBoundary>
  );
}
