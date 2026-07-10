"use client";

import { useState, useMemo } from "react";
import toast, { Toaster } from "react-hot-toast";

import {
  useCreateTrip,
  useTrips,
  useTripOptions,
  useUpdateTrip,
  useUpdateTripStatus,
} from "@/hooks/admin/useTrips";

import type {
  AdminTripItem,
  TripStatus,
  TripWarning,
} from "@/types/admin/trips/trip-management.type";

import TripFormModal from "./TripFormModal";
import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";
import BlockSkeleton from "@/components/common/BlockSkeleton";
import { formatDateTimeVN, formatCurrency } from "@/lib/client/helpers";
import styles from "./TripsContainer.module.css";

const ITEMS_PER_PAGE = 10;

function getStatusLabel(status: TripStatus) {
  const map: Record<TripStatus, string> = {
    OPEN: "Đang bán vé",
    FULL: "Hết chỗ rồi",
    RUNNING: "Xe đang chạy",
    COMPLETED: "Đã về bến",
    CANCELLED: "Đã hủy chuyến",
  };
  return map[status] || status;
}

function getWarningLabel(warning: TripWarning) {
  const map: Record<TripWarning, string> = {
    NO_VEHICLE: "Chưa xếp xe",
    NO_DRIVER: "Thiếu bác tài",
    DEPARTING_SOON: "Xe sắp chạy",
    FULL_SEAT: "Đã hết ghế",
    CANCELLED: "Đã hủy bỏ",
  };
  return map[warning] || warning;
}

export default function TripsContainer() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [keyword, setKeyword] = useState("");
  const [date, setDate] = useState(today);
  const [routeId, setRouteId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [status, setStatus] = useState<"" | TripStatus>("");
  const [warning, setWarning] = useState<"" | TripWarning>("");

  const [openForm, setOpenForm] = useState(false);
  const [formMode, setFormMode] = useState<"CREATE" | "EDIT">("CREATE");
  const [selectedTrip, setSelectedTrip] = useState<AdminTripItem | null>(null);

  // State điều khiển Popup xác nhận hủy gọn nhẹ
  const [openCancelModal, setOpenCancelModal] = useState(false);
  const [tripToCancel, setTripToCancel] = useState<AdminTripItem | null>(null);

  const [appliedFilters, setAppliedFilters] = useState({
    keyword: "",
    date: today,
    routeId: "",
    vehicleId: "",
    driverId: "",
    status: "" as "" | TripStatus,
    warning: "" as "" | TripWarning,
  });

  const [page, setPage] = useState(1);

  const createMutation = useCreateTrip();
  const updateMutation = useUpdateTrip();
  const statusMutation = useUpdateTripStatus();
  const { data: options } = useTripOptions();

  const { data, isLoading, isError } = useTrips({
    keyword: appliedFilters.keyword,
    date: appliedFilters.date || undefined,
    routeId: appliedFilters.routeId
      ? Number(appliedFilters.routeId)
      : undefined,
    vehicleId: appliedFilters.vehicleId
      ? Number(appliedFilters.vehicleId)
      : undefined,
    driverId: appliedFilters.driverId
      ? Number(appliedFilters.driverId)
      : undefined,
    status: appliedFilters.status || undefined,
    warning: appliedFilters.warning || undefined,
    page,
    limit: ITEMS_PER_PAGE,
  });

  const handleApplyFilter = () => {
    setPage(1);
    setAppliedFilters({
      keyword: keyword.trim(),
      date,
      routeId,
      vehicleId,
      driverId,
      status,
      warning,
    });
  };

  const handleClearFilter = () => {
    setKeyword("");
    setDate(today);
    setRouteId("");
    setVehicleId("");
    setDriverId("");
    setStatus("");
    setWarning("");
    setPage(1);

    setAppliedFilters({
      keyword: "",
      date: today,
      routeId: "",
      vehicleId: "",
      driverId: "",
      status: "",
      warning: "",
    });
    toast.success("🧹 Đã xóa bộ lọc, hiển thị lại từ đầu");
  };

  const handleQuickWarning = (nextWarning: "" | TripWarning) => {
    setPage(1);
    setWarning(nextWarning);
    setAppliedFilters((prev) => ({ ...prev, warning: nextWarning }));
  };

  const totalPage = Math.ceil((data?.total ?? 0) / ITEMS_PER_PAGE) || 1;

  const groupedTrips = useMemo(() => {
    return (data?.items ?? []).reduce(
      (acc, trip) => {
        const dateKey = trip.departureDate || "Chưa xếp ngày";
        const routeKey = trip.routeName || "Chưa rõ tuyến";

        if (!acc[dateKey]) acc[dateKey] = {};
        if (!acc[dateKey][routeKey]) acc[dateKey][routeKey] = [];

        acc[dateKey][routeKey].push(trip);
        return acc;
      },
      {} as Record<string, Record<string, AdminTripItem[]>>,
    );
  }, [data?.items]);

  const handleOpenCancelConfirm = (trip: AdminTripItem) => {
    setTripToCancel(trip);
    setOpenCancelModal(true);
  };

  // Payload giờ đây chỉ gửi duy nhất status: "CANCELLED"
  const handleConfirmCancelTrip = () => {
    if (!tripToCancel) return;

    statusMutation.mutate(
      {
        tripId: tripToCancel.tripId,
        payload: { status: "CANCELLED" },
      },
      {
        onSuccess: () => {
          toast.success("🛑 Đã hủy chuyến xe thành công");
          setOpenCancelModal(false);
          setTripToCancel(null);
        },
        onError: (error: any) =>
          toast.error(
            error?.message ||
              "Gặp lỗi nên chưa hủy được chuyến, bạn thử lại sau nhé",
          ),
      },
    );
  };

  if (isLoading) return <BlockSkeleton height={500} />;
  if (isError) {
    return (
      <div className={styles.errorWrapper}>
        <p>
          ⚠️ Máy chủ gặp lỗi khi nạp danh sách chuyến. Bạn vui lòng đợi ít phút
          rồi thử lại nha.
        </p>
      </div>
    );
  }

  return (
    <BlockErrorBoundary fallback={<BlockSkeleton height={500} />}>
      <Toaster position="top-right" />

      <div className={styles.dispatchDashboard}>
        {/* TOP BAR */}
        <div className={styles.topControl}>
          <div className={styles.branding}>
            <div className={styles.busIndicator}></div>
            <div>
              <h1>Quản Lý Lịch Trình Chuyến Xe</h1>
              <p>
                Theo dõi xe chạy, sắp xếp bác tài và mở bán vé hàng ngày cho
                khách
              </p>
            </div>
          </div>
          <button
            className={styles.dispatchBtn}
            onClick={() => {
              setFormMode("CREATE");
              setSelectedTrip(null);
              setOpenForm(true);
            }}
          >
            <span>+</span> Thêm chuyến mới
          </button>
        </div>

        {/* METRICS PANEL */}
        <div className={styles.metricsGrid}>
          <div className={`${styles.metricCard} ${styles.total}`}>
            <span className={styles.cardLabel}>Số chuyến chạy hôm nay</span>
            <strong className={styles.cardValue}>
              {data?.summary.totalTrips ?? 0}
            </strong>
          </div>
          <div className={`${styles.metricCard} ${styles.open}`}>
            <span className={styles.cardLabel}>Đang mở bán vé</span>
            <strong className={styles.cardValue}>
              {data?.summary.openTrips ?? 0}
            </strong>
          </div>
          <div className={`${styles.metricCard} ${styles.running}`}>
            <span className={styles.cardLabel}>Xe đang chạy trên đường</span>
            <strong className={styles.cardValue}>
              {data?.summary.runningTrips ?? 0}
            </strong>
          </div>
          <div className={`${styles.metricCard} ${styles.critical}`}>
            <span className={styles.cardLabel}>Chuyến chưa gán xe</span>
            <strong className={styles.cardValue}>
              {data?.summary.noVehicleTrips ?? 0}
            </strong>
          </div>
          <div className={`${styles.metricCard} ${styles.critical}`}>
            <span className={styles.cardLabel}>Chuyến thiếu tài xế</span>
            <strong className={styles.cardValue}>
              {data?.summary.noDriverTrips ?? 0}
            </strong>
          </div>
        </div>

        {/* QUICK CONTROL TABS */}
        <div className={styles.radarTabs}>
          {(
            [
              "",
              "DEPARTING_SOON",
              "NO_VEHICLE",
              "NO_DRIVER",
              "FULL_SEAT",
              "CANCELLED",
            ] as const
          ).map((type) => (
            <button
              key={type}
              className={`${styles.radarTab} ${appliedFilters.warning === type ? styles.radarTabActive : ""}`}
              onClick={() => handleQuickWarning(type)}
            >
              {type === ""
                ? "Tất cả các chuyến"
                : `Cần xử lý: ${getWarningLabel(type)}`}
            </button>
          ))}
        </div>

        {/* FILTER BAR */}
        <div className={styles.filterConsole}>
          <div className={styles.consoleGrid}>
            <input
              className={styles.consoleInput}
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplyFilter()}
              placeholder="Tìm mã chuyến, biển số, tên bác tài..."
            />

            <input
              className={styles.consoleDate}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />

            <select
              className={styles.consoleSelect}
              value={routeId}
              onChange={(e) => setRouteId(e.target.value)}
            >
              <option value="">-- Chọn tuyến đường chạy --</option>
              {options?.routes.map((route) => (
                <option key={route.routeId} value={route.routeId}>
                  {route.routeName}
                </option>
              ))}
            </select>

            <select
              className={styles.consoleSelect}
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">-- Chọn xe (Biển số xe) --</option>
              {options?.vehicles.map((vehicle) => (
                <option key={vehicle.vehicleId} value={vehicle.vehicleId}>
                  {vehicle.licensePlate} ({vehicle.vehicleTypeName})
                </option>
              ))}
            </select>

            <select
              className={styles.consoleSelect}
              value={driverId}
              onChange={(e) => setDriverId(e.target.value)}
            >
              <option value="">-- Chọn tên bác tài --</option>
              {options?.drivers.map((driver) => (
                <option key={driver.driverId} value={driver.driverId}>
                  {driver.fullName}
                </option>
              ))}
            </select>

            <select
              className={styles.consoleSelect}
              value={status}
              onChange={(e) => setStatus(e.target.value as "" | TripStatus)}
            >
              <option value="">-- Trạng thái chuyến đi --</option>
              <option value="OPEN">Đang mở bán</option>
              <option value="FULL">Hết chỗ rồi</option>
              <option value="RUNNING">Xe đang chạy</option>
              <option value="COMPLETED">Đã về bến</option>
              <option value="CANCELLED">Chuyến đã hủy</option>
            </select>
          </div>
          <div className={styles.consoleActions}>
            <button className={styles.applyBtn} onClick={handleApplyFilter}>
              Tìm kiếm ngay
            </button>
            <button className={styles.resetBtn} onClick={handleClearFilter}>
              Xóa bộ lọc
            </button>
          </div>
        </div>

        {/* MATRIX CONTAINER */}
        <div className={styles.matrixContainer}>
          {Object.entries(groupedTrips).map(([dateName, routes]) => (
            <div key={dateName} className={styles.dateBlock}>
              <div className={styles.dateBlockHeader}>
                <h2>📅 Ngày khởi hành: {dateName}</h2>
                <span className={styles.badgeCount}>
                  Tổng cộng: {Object.values(routes).flat().length} chuyến
                </span>
              </div>

              {Object.entries(routes).map(([routeName, trips]) => (
                <div key={routeName} className={styles.routeSection}>
                  <div className={styles.routeSectionHeader}>
                    <h3>🛣️ Tuyến chạy: {routeName}</h3>
                  </div>

                  <div className={styles.tripsGrid}>
                    {trips.map((trip) => {
                      const hasCriticalWarning =
                        trip.warnings.includes("NO_VEHICLE") ||
                        trip.warnings.includes("NO_DRIVER");
                      return (
                        <div
                          key={trip.tripId}
                          className={`${styles.tripCardNode} ${styles[trip.status.toLowerCase()]} ${hasCriticalWarning ? styles.hasIncident : ""}`}
                        >
                          <div className={styles.nodeTimeline}>
                            <div className={styles.timeMain}>
                              {trip.departureTime}
                            </div>
                            <div className={styles.timeArrive}>
                              Tính cả thời gian chạy, dự kiến đến:{" "}
                              {formatDateTimeVN(trip.arrivalDatetime)}
                            </div>
                          </div>

                          <div className={styles.nodeAsset}>
                            <div className={styles.assetVehicle}>
                              <span className={styles.icon}>🚌</span>
                              {trip.licensePlate ? (
                                <div>
                                  <strong>{trip.licensePlate}</strong>
                                  <span>
                                    {trip.vehicleName || trip.vehicleTypeName}
                                  </span>
                                </div>
                              ) : (
                                <span className={styles.unassigned}>
                                  ⚠️ Chưa sắp xếp xe chạy
                                </span>
                              )}
                            </div>

                            <div className={styles.assetDriver}>
                              <span className={styles.icon}>🪪</span>
                              {trip.driverNames ? (
                                <div>
                                  <strong>{trip.driverNames}</strong>
                                </div>
                              ) : (
                                <span className={styles.unassigned}>
                                  ⚠️ Chưa xếp bác tài chạy
                                </span>
                              )}
                            </div>
                          </div>

                          <div className={styles.nodePrice}>
                            <span className={styles.priceLabel}>
                              Giá vé hiện tại
                            </span>
                            <strong>
                              {trip.ticketPrice
                                ? formatCurrency(trip.ticketPrice)
                                : "Chưa đặt giá"}
                            </strong>
                          </div>

                          <div className={styles.nodeCapacity}>
                            <div className={styles.capacityProgress}>
                              <div
                                className={styles.progressBar}
                                style={{
                                  width: `${((trip.totalSeats - trip.availableSeats) / trip.totalSeats) * 100}%`,
                                }}
                              ></div>
                            </div>
                            <div className={styles.capacityText}>
                              Còn trống <strong>{trip.availableSeats}</strong>{" "}
                              trên tổng {trip.totalSeats} ghế
                            </div>
                          </div>

                          <div className={styles.nodeBadges}>
                            <span
                              className={`${styles.statusPill} ${styles[trip.status.toLowerCase()]}`}
                            >
                              {getStatusLabel(trip.status)}
                            </span>

                            {trip.warnings.map((warn) => (
                              <span
                                key={warn}
                                className={`${styles.warningPill} ${styles[warn.toLowerCase()]}`}
                              >
                                {getWarningLabel(warn)}
                              </span>
                            ))}
                          </div>

                          <div className={styles.nodeActions}>
                            <button
                              className={styles.actionEdit}
                              onClick={() => {
                                setFormMode("EDIT");
                                setSelectedTrip(trip);
                                setOpenForm(true);
                              }}
                            >
                              ✏️ Sửa thông tin
                            </button>
                            <button
                              className={styles.actionCancel}
                              disabled={statusMutation.isPending}
                              onClick={() => handleOpenCancelConfirm(trip)}
                            >
                              ❌ Hủy chuyến
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ))}

          {data?.items.length === 0 && (
            <div className={styles.emptyStateCenter}>
              <div className={styles.emptyIcon}>📂</div>
              <p>Không tìm thấy chuyến xe nào khớp với bộ lọc bạn chọn.</p>
            </div>
          )}
        </div>

        {/* PHÂN TRANG */}
        <div className={styles.consolePagination}>
          <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            &lsaquo; Trang trước
          </button>
          <div className={styles.pageNumber}>
            Trang <span>{data?.page ?? page}</span> trên {totalPage}
          </div>
          <button
            disabled={page >= totalPage}
            onClick={() => setPage((p) => p + 1)}
          >
            Trang sau &rsaquo;
          </button>
        </div>

        {/* MODAL THÊM/SỬA */}
        <TripFormModal
          open={openForm}
          mode={formMode}
          trip={selectedTrip}
          options={options}
          loading={createMutation.isPending || updateMutation.isPending}
          onClose={() => setOpenForm(false)}
          onSubmit={(payload) => {
            if (formMode === "CREATE") {
              createMutation.mutate(payload as any, {
                onSuccess: () => {
                  setOpenForm(false);
                  toast.success("🎉 Đã thêm chuyến xe mới thành công!");
                },
                onError: (error: any) => {
                  toast.error(
                    error?.message ||
                      "Lỗi hệ thống, không thêm được chuyến xe.",
                  );
                },
              });
              return;
            }

            if (!selectedTrip?.tripId) return;

            updateMutation.mutate(
              { tripId: selectedTrip.tripId, payload: payload as any },
              {
                onSuccess: () => {
                  setOpenForm(false);
                  toast.success("💾 Cập nhật thông tin chuyến xe thành công!");
                },
                onError: (error: any) => {
                  toast.error(
                    error?.message || "Lỗi hệ thống, không lưu được thay đổi.",
                  );
                },
              },
            );
          }}
        />

        {/* POPUP XÁC NHẬN HỦY CHUYẾN TINH GỌN */}
        {openCancelModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>
                <h3>🛑 Xác Nhận Hủy Chuyến</h3>
                <button
                  className={styles.closeHeaderBtn}
                  onClick={() => setOpenCancelModal(false)}
                >
                  &times;
                </button>
              </div>
              <div className={styles.modalBody}>
                <p className={styles.warningTextText}>
                  Bạn có chắc chắn muốn hủy chuyến xe xuất phát vào lúc{" "}
                  <strong>{tripToCancel?.departureTime}</strong> ngày{" "}
                  <strong>{tripToCancel?.departureDate}</strong> không?
                </p>
                <blockquote className={styles.dangerNotice}>
                  ⚠️ <strong>Hành động nguy hiểm:</strong> Hệ thống sẽ đóng bán
                  vé và chuyển trạng thái chuyến xe này thành "Đã hủy". Hành
                  động này không thể hoàn tác!
                </blockquote>
              </div>
              <div className={styles.modalFooter}>
                <button
                  className={styles.cancelBtn}
                  onClick={() => setOpenCancelModal(false)}
                  disabled={statusMutation.isPending}
                >
                  Bỏ qua
                </button>
                <button
                  className={styles.confirmBtn}
                  onClick={handleConfirmCancelTrip}
                  disabled={statusMutation.isPending}
                >
                  {statusMutation.isPending
                    ? "Đang hủy..."
                    : "Đồng ý hủy chuyến"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </BlockErrorBoundary>
  );
}
