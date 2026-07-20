"use client";

import { useMemo } from "react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { getCheckinDashboardSummary } from "@/services/server/admin/checkin/admin-checkin-dashboard.service";
import styles from "./CheckinDashboardCharts.module.css";
type CheckinDashboardSummary = Awaited<
  ReturnType<typeof getCheckinDashboardSummary>
>;
interface CheckinDashboardChartsProps {
  summary: CheckinDashboardSummary;
}

interface TooltipPayloadItem {
  name?: string;
  value?: number | string;
  payload?: {
    name?: string;
    value?: number;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  label?: string;
  payload?: TooltipPayloadItem[];
}

const CHECKIN_COLORS = ["#12b76a", "#f79009", "#f04438", "#7f56d9"];

const TRIP_COLOR = "#1570ef";
const ALERT_COLOR = "#f04438";

function CustomTooltip({ active, label, payload }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div className={styles.tooltip}>
      {label && <strong>{label}</strong>}

      {payload.map((item, index) => (
        <div
          key={`${item.name ?? "value"}-${index}`}
          className={styles.tooltipRow}
        >
          <span>{item.name ?? "Số lượng"}</span>

          <strong>{Number(item.value ?? 0).toLocaleString("vi-VN")}</strong>
        </div>
      ))}
    </div>
  );
}

export default function CheckinDashboardCharts({
  summary,
}: CheckinDashboardChartsProps) {
  const checkinStatusData = useMemo(
    () =>
      [
        {
          name: "Đã check-in",
          value: summary.seats.checkedIn,
        },
        {
          name: "Chưa check-in",
          value: summary.seats.notCheckedIn,
        },
        {
          name: "No-show",
          value: summary.seats.noShow,
        },
        {
          name: "Từ chối",
          value: summary.seats.rejected,
        },
      ].filter((item) => item.value > 0),
    [summary.seats],
  );

  const tripPhaseData = useMemo(
    () => [
      {
        name: "Chưa mở",
        value: summary.trips.notOpen,
      },
      {
        name: "Đang mở",
        value: summary.trips.open,
      },
      {
        name: "Nhắc nhở",
        value: summary.trips.reminder,
      },
      {
        name: "Cảnh báo",
        value: summary.trips.warning,
      },
      {
        name: "Nguy cấp",
        value: summary.trips.critical,
      },
      {
        name: "Chờ thêm",
        value: summary.trips.grace,
      },
      {
        name: "Đã đóng",
        value: summary.trips.closed,
      },
    ],
    [summary.trips],
  );

  const alertData = useMemo(
    () => [
      {
        name: "Bình thường",
        value: summary.alerts.normal,
      },
      {
        name: "Nhắc nhở",
        value: summary.alerts.reminder,
      },
      {
        name: "Cảnh báo",
        value: summary.alerts.warning,
      },
      {
        name: "Nguy cấp",
        value: summary.alerts.critical,
      },
      {
        name: "Quá hạn",
        value: summary.alerts.overdue,
      },
    ],
    [summary.alerts],
  );

  const hasCheckinData =
    checkinStatusData.reduce((total, item) => total + item.value, 0) > 0;

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2>Biểu đồ check-in</h2>

          <p>Tổng quan trạng thái hành khách, chuyến xe và mức độ cảnh báo.</p>
        </div>
      </div>

      <div className={styles.chartGrid}>
        <article className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3>Trạng thái hành khách</h3>

              <span>
                Tổng {summary.seats.totalSeats.toLocaleString("vi-VN")} ghế có
                khách
              </span>
            </div>
          </div>

          <div className={styles.chartContainer}>
            {!hasCheckinData ? (
              <div className={styles.emptyState}>
                Chưa có dữ liệu hành khách.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={checkinStatusData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="45%"
                    innerRadius={62}
                    outerRadius={96}
                    paddingAngle={3}
                    labelLine={false}
                  >
                    {checkinStatusData.map((item, index) => (
                      <Cell
                        key={item.name}
                        fill={CHECKIN_COLORS[index % CHECKIN_COLORS.length]}
                      />
                    ))}
                  </Pie>

                  <Tooltip content={<CustomTooltip />} />

                  <Legend
                    verticalAlign="bottom"
                    height={42}
                    iconType="circle"
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </article>

        <article className={styles.chartCard}>
          <div className={styles.chartHeader}>
            <div>
              <h3>Trạng thái chuyến</h3>

              <span>
                Tổng {summary.trips.totalTrips.toLocaleString("vi-VN")} chuyến
              </span>
            </div>
          </div>

          <div className={styles.chartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={tripPhaseData}
                margin={{
                  top: 12,
                  right: 12,
                  left: -18,
                  bottom: 12,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />

                <XAxis
                  dataKey="name"
                  tickLine={false}
                  axisLine={false}
                  interval={0}
                  angle={-18}
                  textAnchor="end"
                  height={62}
                  fontSize={12}
                />

                <YAxis
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />

                <Tooltip content={<CustomTooltip />} />

                <Bar
                  dataKey="value"
                  name="Số chuyến"
                  fill={TRIP_COLOR}
                  radius={[7, 7, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className={`${styles.chartCard} ${styles.fullWidth}`}>
          <div className={styles.chartHeader}>
            <div>
              <h3>Mức độ cảnh báo hành khách</h3>

              <span>Phân loại hành khách cần được ưu tiên xử lý</span>
            </div>
          </div>

          <div className={styles.alertChartContainer}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={alertData}
                layout="vertical"
                margin={{
                  top: 8,
                  right: 24,
                  left: 12,
                  bottom: 8,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />

                <XAxis
                  type="number"
                  allowDecimals={false}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />

                <YAxis
                  type="category"
                  dataKey="name"
                  width={100}
                  tickLine={false}
                  axisLine={false}
                  fontSize={12}
                />

                <Tooltip content={<CustomTooltip />} />

                <Bar
                  dataKey="value"
                  name="Số hành khách"
                  fill={ALERT_COLOR}
                  radius={[0, 7, 7, 0]}
                  maxBarSize={34}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>
      </div>
    </section>
  );
}
