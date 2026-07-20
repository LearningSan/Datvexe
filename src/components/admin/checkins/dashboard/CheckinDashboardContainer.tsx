"use client";

import { useEffect, useMemo, useState } from "react";
import { MoreHorizontal } from "lucide-react";

import PassengerActionModal from "./PassengerActionModal";
import CheckinDashboardCharts from "./CheckinDashboardCharts";
import type { CheckinDashboardPassengerItem } from "@/types/admin/checkin/checkin-dashboard-passenger.type";
import {
  AlertTriangle,
  Bus,
  CheckCircle2,
  Clock3,
  Pause,
  Play,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";

import {
  useCheckinDashboardPassengers,
  useCheckinDashboardSummary,
  useCheckinDashboardTrips,
} from "@/hooks/admin/use-checkin-dashboard";

import type {
  CheckinPhase,
  CheckinStatus,
  PassengerAlertLevel,
} from "@/types/admin/checkin/checkin-operation.type";

import type { CheckinDashboardTripSort } from "@/types/admin/checkin/checkin-dashboard-trip.type";

import type { CheckinDashboardPassengerSort } from "@/types/admin/checkin/checkin-dashboard-passenger.type";

import styles from "./CheckinDashboardContainer.module.css";

const AUTO_REFRESH_INTERVAL = 10_000;
const PHASE_OPTIONS: Array<{
  value: "" | CheckinPhase;
  label: string;
}> = [
  {
    value: "",
    label: "Tất cả",
  },
  {
    value: "CRITICAL",
    label: "Nguy cấp",
  },
  {
    value: "GRACE",
    label: "Chờ thêm",
  },
  {
    value: "WARNING",
    label: "Cảnh báo",
  },
  {
    value: "OPEN",
    label: "Đang mở",
  },
  {
    value: "CLOSED",
    label: "Đã đóng",
  },
];

const CHECKIN_STATUS_OPTIONS: Array<{
  value: "" | CheckinStatus;
  label: string;
}> = [
  {
    value: "",
    label: "Tất cả trạng thái",
  },
  {
    value: "NOT_CHECKED_IN",
    label: "Chưa check-in",
  },
  {
    value: "CHECKED_IN",
    label: "Đã check-in",
  },
  {
    value: "NO_SHOW",
    label: "No-show",
  },
  {
    value: "REJECTED",
    label: "Từ chối lên xe",
  },
];

const ALERT_OPTIONS: Array<{
  value: "" | PassengerAlertLevel;
  label: string;
}> = [
  {
    value: "",
    label: "Tất cả cảnh báo",
  },
  {
    value: "OVERDUE",
    label: "Quá hạn",
  },
  {
    value: "CRITICAL",
    label: "Nguy cấp",
  },
  {
    value: "WARNING",
    label: "Cảnh báo",
  },
  {
    value: "REMINDER",
    label: "Nhắc nhở",
  },
  {
    value: "NORMAL",
    label: "Bình thường",
  },
];

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function getPhaseLabel(phase: CheckinPhase): string {
  const labels: Record<CheckinPhase, string> = {
    NOT_OPEN: "Chưa mở",
    OPEN: "Đang mở",
    REMINDER: "Nhắc nhở",
    WARNING: "Cảnh báo",
    CRITICAL: "Nguy cấp",
    GRACE: "Chờ thêm",
    CLOSED: "Đã đóng",
  };

  return labels[phase];
}

function getCheckinStatusLabel(status: CheckinStatus): string {
  const labels: Record<CheckinStatus, string> = {
    NOT_CHECKED_IN: "Chưa check-in",
    CHECKED_IN: "Đã check-in",
    NO_SHOW: "No-show",
    REJECTED: "Từ chối lên xe",
  };

  return labels[status];
}

function getAlertLabel(level: PassengerAlertLevel): string {
  const labels: Record<PassengerAlertLevel, string> = {
    NORMAL: "Bình thường",
    REMINDER: "Nhắc nhở",
    WARNING: "Cảnh báo",
    CRITICAL: "Nguy cấp",
    OVERDUE: "Quá hạn",
  };

  return labels[level];
}

export default function CheckinDashboardContainer() {
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [selectedPassenger, setSelectedPassenger] =
    useState<CheckinDashboardPassengerItem | null>(null);
  const [phase, setPhase] = useState<"" | CheckinPhase>("");

  const [tripKeyword, setTripKeyword] = useState("");

  const [tripPage, setTripPage] = useState(1);

  const [tripSort, setTripSort] =
    useState<CheckinDashboardTripSort>("DEPARTURE_ASC");

  const [selectedTripId, setSelectedTripId] = useState<number>(0);

  const [passengerCheckinStatus, setPassengerCheckinStatus] = useState<
    "" | CheckinStatus
  >("");

  const [passengerAlert, setPassengerAlert] = useState<
    "" | PassengerAlertLevel
  >("");

  const [passengerKeyword, setPassengerKeyword] = useState("");

  const [passengerPage, setPassengerPage] = useState(1);

  const [passengerSort, setPassengerSort] =
    useState<CheckinDashboardPassengerSort>("ALERT_DESC");
  const dashboardRefetchInterval =
    autoRefreshEnabled && selectedPassenger === null
      ? AUTO_REFRESH_INTERVAL
      : false;
  const summaryQuery = useCheckinDashboardSummary({
    refetchInterval: dashboardRefetchInterval,
  });
  const tripsQuery = useCheckinDashboardTrips(
    {
      phase: phase || undefined,
      keyword: tripKeyword || undefined,
      page: tripPage,
      limit: 10,
      sort: tripSort,
    },
    {
      refetchInterval: dashboardRefetchInterval,
    },
  );

  const passengersQuery = useCheckinDashboardPassengers(
    {
      tripId: selectedTripId,

      checkinStatus: passengerCheckinStatus || undefined,

      alert: passengerAlert || undefined,

      keyword: passengerKeyword || undefined,

      page: passengerPage,
      limit: 20,
      sort: passengerSort,
    },
    {
      refetchInterval: dashboardRefetchInterval,
    },
  );

  const trips = useMemo(
    () => tripsQuery.data?.items ?? [],
    [tripsQuery.data?.items],
  );

  useEffect(() => {
    if (trips.length === 0) {
      if (!tripsQuery.isFetching) {
        setSelectedTripId(0);
      }

      return;
    }

    if (selectedTripId <= 0) {
      setSelectedTripId(trips[0].tripId);
    }
  }, [trips, selectedTripId, tripsQuery.isFetching]);

  function refreshDashboard() {
    void Promise.all([
      summaryQuery.refetch(),
      tripsQuery.refetch(),

      selectedTripId > 0 ? passengersQuery.refetch() : Promise.resolve(),
    ]);
  }

  const isRefreshing =
    summaryQuery.isFetching ||
    tripsQuery.isFetching ||
    passengersQuery.isFetching;

  if (summaryQuery.isLoading || tripsQuery.isLoading) {
    return <div className={styles.stateBox}>Đang tải dữ liệu dashboard...</div>;
  }

  if (summaryQuery.isError || tripsQuery.isError) {
    return (
      <div className={styles.stateBox}>
        <p>Không thể tải dữ liệu check-in.</p>

        <button
          type="button"
          onClick={refreshDashboard}
          className={styles.primaryButton}
        >
          Thử lại
        </button>
      </div>
    );
  }

  const summary = summaryQuery.data;

  return (
    <section className={styles.dashboard}>
      <header className={styles.header}>
        <div>
          <h1>Check-in Dashboard</h1>

          <p>
            Theo dõi trạng thái check-in và cảnh báo hành khách theo thời gian
            thực.
          </p>
        </div>
        <div className={styles.refreshStatus}>
          <span
            className={autoRefreshEnabled ? styles.liveDot : styles.pausedDot}
          />

          {selectedPassenger
            ? "Tạm dừng cập nhật khi đang thao tác"
            : autoRefreshEnabled
              ? "Tự động cập nhật mỗi 10 giây"
              : "Đã tắt tự động cập nhật"}
        </div>
        <div className={styles.headerActions}>
          <button
            type="button"
            className={
              autoRefreshEnabled
                ? styles.autoRefreshActive
                : styles.autoRefreshButton
            }
            onClick={() => setAutoRefreshEnabled((current) => !current)}
          >
            {autoRefreshEnabled ? <Pause size={17} /> : <Play size={17} />}

            {autoRefreshEnabled ? "Tạm dừng tự động" : "Bật tự động cập nhật"}
          </button>

          <button
            type="button"
            className={styles.refreshButton}
            onClick={refreshDashboard}
            disabled={isRefreshing}
          >
            <RefreshCw
              size={18}
              className={isRefreshing ? styles.spinning : undefined}
            />
            Làm mới
          </button>
        </div>
      </header>

      {summary && (
        <div className={styles.kpiGrid}>
          <article className={styles.kpiCard}>
            <div className={styles.kpiIcon}>
              <Users size={22} />
            </div>

            <div>
              <span>Tổng ghế có khách</span>
              <strong>{summary.seats.totalSeats}</strong>
            </div>
          </article>

          <article className={styles.kpiCard}>
            <div className={styles.kpiIcon}>
              <UserCheck size={22} />
            </div>

            <div>
              <span>Tỷ lệ check-in</span>
              <strong>{summary.seats.checkinRate}%</strong>

              <small>
                {summary.seats.checkedIn}/{summary.seats.totalSeats} ghế
              </small>
            </div>
          </article>

          <article className={styles.kpiCard}>
            <div className={styles.kpiIcon}>
              <UserX size={22} />
            </div>

            <div>
              <span>No-show</span>
              <strong>{summary.seats.noShow}</strong>

              <small>{summary.seats.noShowRate}%</small>
            </div>
          </article>

          <article className={styles.kpiCard}>
            <div className={styles.kpiIcon}>
              <AlertTriangle size={22} />
            </div>

            <div>
              <span>Chuyến nguy cấp</span>
              <strong>{summary.trips.critical}</strong>

              <small>Quá hạn: {summary.alerts.overdue}</small>
            </div>
          </article>
        </div>
      )}
      {summary && <CheckinDashboardCharts summary={summary} />}
      <div className={styles.contentGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Danh sách chuyến</h2>

              <span>{tripsQuery.data?.pagination.totalItems ?? 0} chuyến</span>
            </div>
          </div>

          <div className={styles.filters}>
            <label className={styles.searchBox}>
              <Search size={17} />

              <input
                value={tripKeyword}
                onChange={(event) => {
                  setTripKeyword(event.target.value);
                  setTripPage(1);
                }}
                placeholder="Tuyến, biển số, tài xế..."
              />
            </label>

            <select
              value={phase}
              onChange={(event) => {
                setPhase(event.target.value as "" | CheckinPhase);
                setTripPage(1);
              }}
            >
              {PHASE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              value={tripSort}
              onChange={(event) => {
                setTripSort(event.target.value as CheckinDashboardTripSort);
                setTripPage(1);
              }}
            >
              <option value="DEPARTURE_ASC">Khởi hành gần nhất</option>

              <option value="DEPARTURE_DESC">Khởi hành xa nhất</option>

              <option value="CHECKIN_RATE_ASC">Check-in thấp trước</option>

              <option value="CHECKIN_RATE_DESC">Check-in cao trước</option>
            </select>
          </div>

          <div className={styles.tripList}>
            {trips.length === 0 ? (
              <div className={styles.emptyState}>Không có chuyến phù hợp.</div>
            ) : (
              trips.map((trip) => {
                const isSelected = trip.tripId === selectedTripId;

                return (
                  <button
                    key={trip.tripId}
                    type="button"
                    className={`${styles.tripCard} ${
                      isSelected ? styles.tripCardSelected : ""
                    }`}
                    onClick={() => {
                      setSelectedTripId(trip.tripId);
                      setPassengerPage(1);
                    }}
                  >
                    <div className={styles.tripCardTop}>
                      <div>
                        <strong>{trip.routeName}</strong>

                        <span>
                          <Clock3 size={15} />

                          {formatDateTime(trip.departureDatetime)}
                        </span>
                      </div>

                      <span
                        className={`${styles.badge} ${
                          styles[`phase${trip.phase}`]
                        }`}
                      >
                        {getPhaseLabel(trip.phase)}
                      </span>
                    </div>

                    <div className={styles.tripVehicle}>
                      <Bus size={15} />

                      <span>{trip.licensePlate ?? "Chưa gán xe"}</span>

                      {trip.driverNames.length > 0 && (
                        <span>· {trip.driverNames.join(", ")}</span>
                      )}
                    </div>

                    <div className={styles.progressTrack}>
                      <div
                        className={styles.progressValue}
                        style={{
                          width: `${Math.min(trip.seats.checkinRate, 100)}%`,
                        }}
                      />
                    </div>

                    <div className={styles.tripStatistics}>
                      <span>
                        <CheckCircle2 size={15} />
                        {trip.seats.checkedIn}/{trip.seats.totalSeats} check-in
                      </span>

                      <span>Cảnh báo: {getAlertLabel(trip.highestAlert)}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className={styles.pagination}>
            <button
              type="button"
              disabled={tripPage <= 1}
              onClick={() => setTripPage((current) => Math.max(1, current - 1))}
            >
              Trước
            </button>

            <span>
              Trang {tripPage}/
              {Math.max(tripsQuery.data?.pagination.totalPages ?? 1, 1)}
            </span>

            <button
              type="button"
              disabled={
                tripPage >= (tripsQuery.data?.pagination.totalPages ?? 0)
              }
              onClick={() => setTripPage((current) => current + 1)}
            >
              Sau
            </button>
          </div>
        </section>

        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Passenger Monitor</h2>

              {passengersQuery.data?.trip && (
                <span>{passengersQuery.data.trip.routeName}</span>
              )}
            </div>
          </div>

          {selectedTripId <= 0 ? (
            <div className={styles.emptyState}>
              Chọn một chuyến để xem hành khách.
            </div>
          ) : (
            <>
              <div className={styles.filters}>
                <label className={styles.searchBox}>
                  <Search size={17} />

                  <input
                    value={passengerKeyword}
                    onChange={(event) => {
                      setPassengerKeyword(event.target.value);
                      setPassengerPage(1);
                    }}
                    placeholder="Tên, SĐT, mã vé, ghế..."
                  />
                </label>

                <select
                  value={passengerCheckinStatus}
                  onChange={(event) => {
                    setPassengerCheckinStatus(
                      event.target.value as "" | CheckinStatus,
                    );
                    setPassengerPage(1);
                  }}
                >
                  {CHECKIN_STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={passengerAlert}
                  onChange={(event) => {
                    setPassengerAlert(
                      event.target.value as "" | PassengerAlertLevel,
                    );
                    setPassengerPage(1);
                  }}
                >
                  {ALERT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                <select
                  value={passengerSort}
                  onChange={(event) => {
                    setPassengerSort(
                      event.target.value as CheckinDashboardPassengerSort,
                    );
                    setPassengerPage(1);
                  }}
                >
                  <option value="ALERT_DESC">Cảnh báo cao trước</option>

                  <option value="SEAT_ASC">Ghế tăng dần</option>

                  <option value="SEAT_DESC">Ghế giảm dần</option>

                  <option value="NAME_ASC">Tên A-Z</option>

                  <option value="NAME_DESC">Tên Z-A</option>
                </select>
              </div>

              {passengersQuery.isLoading ? (
                <div className={styles.emptyState}>Đang tải hành khách...</div>
              ) : passengersQuery.isError ? (
                <div className={styles.emptyState}>
                  Không thể tải hành khách.
                </div>
              ) : (
                <>
                  <div className={styles.passengerSummary}>
                    <span>
                      Tổng: {passengersQuery.data?.summary.totalSeats ?? 0}
                    </span>

                    <span>
                      Đã check-in:{" "}
                      {passengersQuery.data?.summary.checkedIn ?? 0}
                    </span>

                    <span>
                      Chưa check-in:{" "}
                      {passengersQuery.data?.summary.notCheckedIn ?? 0}
                    </span>

                    <span>
                      Quá hạn: {passengersQuery.data?.summary.overdue ?? 0}
                    </span>
                  </div>

                  <div className={styles.passengerTableWrapper}>
                    <table className={styles.passengerTable}>
                      <thead>
                        <tr>
                          <th>Ghế</th>
                          <th>Hành khách</th>
                          <th>Liên hệ</th>
                          <th>Check-in</th>
                          <th>Cảnh báo</th>
                          <th>Điểm đón</th>
                          <th>Thao tác</th>
                        </tr>
                      </thead>

                      <tbody>
                        {passengersQuery.data?.items.length === 0 ? (
                          <tr>
                            <td colSpan={7} className={styles.tableEmpty}>
                              Không có hành khách phù hợp.
                            </td>
                          </tr>
                        ) : (
                          passengersQuery.data?.items.map((item) => (
                            <tr key={item.bookingSeatId}>
                              <td>
                                <strong>{item.seatNumber}</strong>
                              </td>

                              <td>
                                <strong>{item.passenger.name}</strong>

                                <small>{item.bookingCode}</small>
                              </td>

                              <td>
                                <span>{item.passenger.phone}</span>

                                <small>{item.contact.status}</small>
                              </td>

                              <td>
                                <span
                                  className={`${styles.badge} ${
                                    styles[`checkin${item.checkin.status}`]
                                  }`}
                                >
                                  {getCheckinStatusLabel(item.checkin.status)}
                                </span>
                              </td>

                              <td>
                                <span
                                  className={`${styles.badge} ${
                                    styles[`alert${item.alert.level}`]
                                  }`}
                                >
                                  {getAlertLabel(item.alert.level)}
                                </span>
                              </td>

                              <td>
                                <span>
                                  {item.pickup.pointName ??
                                    (item.pickup.method === "SHUTTLE"
                                      ? "Trung chuyển"
                                      : "Tại văn phòng")}
                                </span>

                                <small>{item.pickup.address ?? ""}</small>
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className={styles.actionButton}
                                  onClick={() => setSelectedPassenger(item)}
                                  aria-label={`Thao tác với ${item.passenger.name}`}
                                >
                                  <MoreHorizontal size={18} />
                                  Thao tác
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  <div className={styles.pagination}>
                    <button
                      type="button"
                      disabled={passengerPage <= 1}
                      onClick={() =>
                        setPassengerPage((current) => Math.max(1, current - 1))
                      }
                    >
                      Trước
                    </button>

                    <span>
                      Trang {passengerPage}/
                      {Math.max(
                        passengersQuery.data?.pagination.totalPages ?? 1,
                        1,
                      )}
                    </span>

                    <button
                      type="button"
                      disabled={
                        passengerPage >=
                        (passengersQuery.data?.pagination.totalPages ?? 0)
                      }
                      onClick={() => setPassengerPage((current) => current + 1)}
                    >
                      Sau
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </section>
      </div>
      <PassengerActionModal
        open={selectedPassenger !== null}
        passenger={selectedPassenger}
        onClose={() => setSelectedPassenger(null)}
      />
    </section>
  );
}
