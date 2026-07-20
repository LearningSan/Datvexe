"use client";

import { useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import {
  useAdminTickets,
  useAdminTicketOptions,
  useCancelAdminTicket,
  useCheckinAdminTicket,
  useCreateAdminOfflineTicket,
  useUpdateAdminTicketStatus,
} from "@/hooks/admin/useTickets";
import type {
  AdminTicketItem,
  BookingStatus,
  PaymentStatus,
  HoldStatus,
  TicketWarning,
  CreateOfflineTicketPayload,
} from "@/types/admin/tickets/ticket-management.type";
import TicketDetailModal from "./TicketDetailModal";
import TicketCancelModal from "./TicketCancelModal";
import TicketStatusModal from "./TicketStatusModal";
import OfflineTicketModal from "./OfflineTicketModal";
import BlockSkeleton from "@/components/common/BlockSkeleton";
import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";
import { formatCurrency, formatDateTimeVN } from "@/lib/client/helpers";
import styles from "./TicketsContainer.module.css";

const LIMIT = 10;

const bookingStatusLabels: Record<BookingStatus, string> = {
  PENDING: "Chờ xử lý",
  CONFIRMED: "Đã xác nhận",
  CANCELLED: "Đã hủy vé",
  REFUNDED: "Đã hoàn tiền",
};

const paymentStatusLabels: Record<PaymentStatus, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thanh toán lỗi",
  REFUNDED: "Đã hoàn tiền",
};

const holdStatusLabels: Record<HoldStatus, string> = {
  NONE: "Không giữ chỗ",
  HOLDING: "Đang giữ chỗ",
  EXPIRED: "Hết hạn giữ",
};

const warningLabels: Record<TicketWarning, string> = {
  HOLD_EXPIRING_SOON: "Sắp hết hạn giữ chỗ",
  HOLD_EXPIRED_NOT_CANCELLED: "Hết hạn giữ nhưng chưa hủy",
  CONFIRMED_MISSING_SEAT: "Booking thiếu vị trí ghế",
  DUPLICATED_SEAT: "Trùng lặp vị trí ghế",
  CANCELLED_SEAT_NOT_RELEASED: "Vé đã hủy chưa giải phóng ghế",
  REFUNDED_STATUS_NOT_UPDATED: "Sai lệch trạng thái hoàn tiền",
  DEPARTING_SOON_NOT_CHECKED_IN: "Xe sắp chạy chưa Check-in",
};

export default function TicketsContainer() {
  const [page, setPage] = useState(1);

  // Khởi tạo bộ lọc tìm kiếm ban đầu
  const [filters, setFilters] = useState({
    keyword: "",
    bookingCode: "",
    customerName: "",
    customerPhone: "",
    routeId: "",
    tripId: "",
    departureDate: "",
    bookingStatus: "" as "" | BookingStatus,
    paymentStatus: "" as "" | PaymentStatus,
    holdStatus: "" as "" | HoldStatus,
    warning: "" as "" | TicketWarning,
    onlyHolding: false,
    onlyNeedAction: false,
  });

  const [appliedFilters, setAppliedFilters] = useState({ ...filters });

  // Quản lý trạng thái đóng/mở của các hộp thoại (Modals)
  const [selectedTicket, setSelectedTicket] = useState<AdminTicketItem | null>(
    null,
  );
  const [statusTicketTarget, setStatusTicketTarget] =
    useState<AdminTicketItem | null>(null);
  const [cancelTicketTarget, setCancelTicketTarget] =
    useState<AdminTicketItem | null>(null);
  const [isOfflineModalOpen, setIsOfflineModalOpen] = useState(false);
  const [confirmTicketTarget, setConfirmTicketTarget] =
    useState<AdminTicketItem | null>(null);
  // Các Hooks gọi API (React Query)
  const { data: options } = useAdminTicketOptions();
  const { data, isLoading, isError } = useAdminTickets({
    keyword: appliedFilters.keyword,
    bookingCode: appliedFilters.bookingCode || undefined,
    customerName: appliedFilters.customerName || undefined,
    customerPhone: appliedFilters.customerPhone || undefined,
    routeId: appliedFilters.routeId
      ? Number(appliedFilters.routeId)
      : undefined,
    tripId: appliedFilters.tripId ? Number(appliedFilters.tripId) : undefined,
    departureDate: appliedFilters.departureDate || undefined,
    bookingStatus: appliedFilters.bookingStatus || undefined,
    paymentStatus: appliedFilters.paymentStatus || undefined,
    holdStatus: appliedFilters.holdStatus || undefined,
    warning: appliedFilters.warning || undefined,
    onlyHolding: appliedFilters.onlyHolding || undefined,
    onlyNeedAction: appliedFilters.onlyNeedAction || undefined,
    page,
    limit: LIMIT,
  });

  const statusMutation = useUpdateAdminTicketStatus();
  const cancelMutation = useCancelAdminTicket();
  const checkinMutation = useCheckinAdminTicket();
  const offlineMutation = useCreateAdminOfflineTicket();

  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil((data?.total ?? 0) / LIMIT));
  }, [data?.total]);

  // Hành động xử lý bộ lọc
  const handleApplyFilters = () => {
    setAppliedFilters({ ...filters });
    setPage(1);
  };

  const handleResetFilters = () => {
    const defaultFilters = {
      keyword: "",
      bookingCode: "",
      customerName: "",
      customerPhone: "",
      routeId: "",
      tripId: "",
      departureDate: "",
      bookingStatus: "" as const,
      paymentStatus: "" as const,
      holdStatus: "" as const,
      warning: "" as const,
      onlyHolding: false,
      onlyNeedAction: false,
    };
    setFilters(defaultFilters);
    setAppliedFilters(defaultFilters);
    setPage(1);
  };

  const handleWarningCardClick = (type: TicketWarning) => {
    const targetWarning = appliedFilters.warning === type ? "" : type;
    setFilters((prev) => ({ ...prev, warning: targetWarning }));
    setAppliedFilters((prev) => ({ ...prev, warning: targetWarning }));
    setPage(1);
  };

  // Các nghiệp vụ tương tác trực tiếp trên dòng (Row Actions)
  const handleConfirmTicket = (ticket: AdminTicketItem) => {
    setConfirmTicketTarget(ticket);
  };
  const handleSubmitConfirmTicket = () => {
    if (!confirmTicketTarget) {
      return;
    }

    statusMutation.mutate(
      {
        bookingId: confirmTicketTarget.bookingId,
        payload: {
          status: "CONFIRMED",
          markPaymentPaid: confirmTicketTarget.paymentStatus !== "PAID",
        },
      },
      {
        onSuccess: () => {
          toast.success("Phê duyệt và xác nhận đơn vé thành công");
          setConfirmTicketTarget(null);
        },
        onError: (error: unknown) => {
          toast.error(
            error instanceof Error ? error.message : "Không thể duyệt đơn vé",
          );
        },
      },
    );
  };

  const handleCheckinTicket = (ticket: AdminTicketItem) => {
    checkinMutation.mutate(ticket.bookingId, {
      onSuccess: () =>
        toast.success("Đã ghi nhận Check-in lên xe cho toàn bộ đơn"),
      onError: (err: any) =>
        toast.error(err.message || "Không thể thực hiện check-in"),
    });
  };

  if (isLoading) {
    return (
      <div className={styles.loaderContainer}>
        <BlockSkeleton height={650} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={styles.errorAlert}>
        ⚠️ Đã xảy ra lỗi kết nối với máy chủ. Không thể tải danh sách quản lý
        vé. Vui lòng tải lại trang.
      </div>
    );
  }

  return (
    <BlockErrorBoundary
      fallback={
        <div className={styles.loaderContainer}>
          <BlockSkeleton height={650} />
        </div>
      }
    >
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      <div className={styles.dashboardPage}>
        {/* SECTION 1: Tiêu đề & Hành động chính */}
        <header className={styles.pageHeader}>
          <div className={styles.headerInfo}>
            <h1>Điều Hành Bán Vé & Giữ Chỗ</h1>
            <p>
              Hệ thống tổng hợp dữ liệu hành trình, kiểm soát trạng thái giữ chỗ
              thời gian thực, phòng ngừa trùng lặp ghế và hỗ trợ quyết toán quầy
              bán vé trực tiếp.
            </p>
          </div>
          <button
            className={styles.createBtn}
            onClick={() => setIsOfflineModalOpen(true)}
          >
            <span className={styles.plusIcon}>+</span> Lập vé tại quầy (Offline)
          </button>
        </header>

        {/* SECTION 2: Chỉ số cảnh báo vận hành nhanh */}
        <section className={styles.dashboardStats}>
          <button
            className={`${styles.statCard} ${appliedFilters.warning === "HOLD_EXPIRING_SOON" ? styles.statCardActive : ""}`}
            onClick={() => handleWarningCardClick("HOLD_EXPIRING_SOON")}
          >
            <span className={styles.statLabel}>Sắp hết hạn giữ</span>
            <strong className={styles.statValue}>
              {data?.summary.holdExpiringSoon ?? 0}
            </strong>
          </button>

          <button
            className={`${styles.statCard} ${appliedFilters.warning === "HOLD_EXPIRED_NOT_CANCELLED" ? styles.statCardActive : ""}`}
            onClick={() => handleWarningCardClick("HOLD_EXPIRED_NOT_CANCELLED")}
          >
            <span className={styles.statLabel}>Hết hạn chưa hủy</span>
            <strong className={styles.statValue}>
              {data?.summary.holdExpiredNotCancelled ?? 0}
            </strong>
          </button>

          <button
            className={`${styles.statCard} ${appliedFilters.warning === "DUPLICATED_SEAT" ? styles.statCardActive : ""}`}
            onClick={() => handleWarningCardClick("DUPLICATED_SEAT")}
          >
            <span className={styles.statLabel}>Vị trí trùng ghế</span>
            <strong className={styles.statValue}>
              {data?.summary.duplicatedSeats ?? 0}
            </strong>
          </button>

          <button
            className={`${styles.statCard} ${appliedFilters.warning === "DEPARTING_SOON_NOT_CHECKED_IN" ? styles.statCardActive : ""}`}
            onClick={() =>
              handleWarningCardClick("DEPARTING_SOON_NOT_CHECKED_IN")
            }
          >
            <span className={styles.statLabel}>Sắp chạy chưa Check-in</span>
            <strong className={styles.statValue}>
              {data?.summary.departingSoonNotCheckedIn ?? 0}
            </strong>
          </button>
        </section>

        {/* SECTION 3: Bộ lọc nâng cao */}
        <section className={styles.filterSection}>
          <div className={styles.filterFormGrid}>
            <label className={styles.fieldGroup}>
              <span>Tìm kiếm tổng hợp</span>
              <input
                placeholder="Mã vé, tên khách, SĐT..."
                value={filters.keyword}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, keyword: e.target.value }))
                }
              />
            </label>

            <label className={styles.fieldGroup}>
              <span>Mã Booking</span>
              <input
                placeholder="Chính xác mã đơn"
                value={filters.bookingCode}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, bookingCode: e.target.value }))
                }
              />
            </label>

            <label className={styles.fieldGroup}>
              <span>Họ và tên khách</span>
              <input
                placeholder="Tên người đặt"
                value={filters.customerName}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, customerName: e.target.value }))
                }
              />
            </label>

            <label className={styles.fieldGroup}>
              <span>Số điện thoại</span>
              <input
                placeholder="Số máy liên hệ"
                value={filters.customerPhone}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, customerPhone: e.target.value }))
                }
              />
            </label>

            <label className={styles.fieldGroup}>
              <span>Tuyến khai thác</span>
              <select
                value={filters.routeId}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    routeId: e.target.value,
                    tripId: "",
                  }))
                }
              >
                <option value="">Tất cả tuyến đường</option>
                {options?.routes.map((r) => (
                  <option key={r.routeId} value={r.routeId}>
                    {r.routeName}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.fieldGroup}>
              <span>Chuyến xe chi tiết</span>
              <select
                value={filters.tripId}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, tripId: e.target.value }))
                }
              >
                <option value="">Tất cả chuyến xe</option>
                {options?.trips
                  .filter(
                    (t) =>
                      !filters.routeId || String(t.routeId) === filters.routeId,
                  )
                  .map((t) => (
                    <option key={t.tripId} value={t.tripId}>
                      {t.tripName}
                    </option>
                  ))}
              </select>
            </label>

            <label className={styles.fieldGroup}>
              <span>Ngày xuất bến</span>
              <input
                type="date"
                value={filters.departureDate}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, departureDate: e.target.value }))
                }
              />
            </label>

            <label className={styles.fieldGroup}>
              <span>Trạng thái đơn vé</span>
              <select
                value={filters.bookingStatus}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    bookingStatus: e.target.value as any,
                  }))
                }
              >
                <option value="">Tất cả trạng thái</option>
                {Object.entries(bookingStatusLabels).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.fieldGroup}>
              <span>Quyết toán dòng tiền</span>
              <select
                value={filters.paymentStatus}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    paymentStatus: e.target.value as any,
                  }))
                }
              >
                <option value="">Tất cả trạng thái tiền</option>
                {Object.entries(paymentStatusLabels).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <label className={styles.fieldGroup}>
              <span>Trạng thái giữ chỗ</span>
              <select
                value={filters.holdStatus}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    holdStatus: e.target.value as any,
                  }))
                }
              >
                <option value="">Tất cả trạng thái giữ</option>
                {Object.entries(holdStatusLabels).map(([val, label]) => (
                  <option key={val} value={val}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            <div className={styles.filterCheckboxes}>
              <label className={styles.checkboxItem}>
                <input
                  type="checkbox"
                  checked={filters.onlyHolding}
                  onChange={(e) =>
                    setFilters((p) => ({ ...p, onlyHolding: e.target.checked }))
                  }
                />
                <span>Chỉ hiện đơn đang giữ vị trí</span>
              </label>

              <label className={styles.checkboxItem}>
                <input
                  type="checkbox"
                  checked={filters.onlyNeedAction}
                  onChange={(e) =>
                    setFilters((p) => ({
                      ...p,
                      onlyNeedAction: e.target.checked,
                    }))
                  }
                />
                <span>Chỉ hiện đơn khẩn cấp cần xử lý</span>
              </label>
            </div>
          </div>

          <div className={styles.filterActions}>
            <button className={styles.executeBtn} onClick={handleApplyFilters}>
              Tìm kiếm
            </button>
            <button className={styles.resetBtn} onClick={handleResetFilters}>
              Xóa bộ lọc
            </button>
          </div>
        </section>

        {/* SECTION 4: Tabs phân loại trạng thái xử lý đơn */}
        <nav className={styles.statusTabsBar}>
          {(["", "PENDING", "CONFIRMED", "CANCELLED", "REFUNDED"] as const).map(
            (status) => (
              <button
                key={status || "ALL"}
                className={
                  appliedFilters.bookingStatus === status
                    ? styles.tabActive
                    : ""
                }
                onClick={() => {
                  setFilters((p) => ({ ...p, bookingStatus: status }));
                  setAppliedFilters((p) => ({ ...p, bookingStatus: status }));
                  setPage(1);
                }}
              >
                {status ? bookingStatusLabels[status] : "Tất cả dữ liệu đơn"}
              </button>
            ),
          )}
        </nav>

        {/* SECTION 5: Bảng hiển thị dữ liệu tập trung */}
        <div className={styles.mainTableCard}>
          <div className={styles.responsiveWrapper}>
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Mã Đơn / Thời Gian Mua</th>
                  <th>Thông Tin Khách Hàng</th>
                  <th>Lộ Trình & Chuyến Xe</th>
                  <th>Vị Trí Ghế</th>
                  <th>Tổng Tiền</th>
                  <th>Trạng Thái Đơn</th>
                  <th>Giữ Chỗ</th>
                  <th>Cảnh Báo Vận Hành</th>
                  <th className={styles.actionsColumnHeader}>
                    Thao Tác Hệ Thống
                  </th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((item) => (
                  <tr
                    key={item.bookingId}
                    className={
                      item.warnings.length > 0 ? styles.rowWarningHighlight : ""
                    }
                  >
                    <td>
                      <span className={styles.primaryCellText}>
                        {item.bookingCode}
                      </span>
                      <span className={styles.secondaryCellText}>
                        {formatDateTimeVN(item.createdAt)}
                      </span>
                    </td>
                    <td>
                      <span className={styles.primaryCellText}>
                        {item.customerName}
                      </span>
                      <span className={styles.secondaryCellText}>
                        {item.customerPhone}
                      </span>
                    </td>
                    <td>
                      <span className={styles.primaryCellText}>
                        {item.routeName}
                      </span>
                      <span className={styles.secondaryCellText}>
                        {formatDateTimeVN(item.departureDatetime)} • Chuyến: #
                        {item.tripId}
                      </span>
                    </td>
                    <td>
                      <span className={styles.seatBadge}>
                        {item.seatNumbers || "—"}
                      </span>
                      <span className={styles.secondaryCellText}>
                        Số lượng: {item.seatCount} ghế
                      </span>
                    </td>
                    <td>
                      <strong className={styles.priceHighlight}>
                        {formatCurrency(item.totalAmount)}
                      </strong>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${styles[`status_${item.bookingStatus.toLowerCase()}`]}`}
                      >
                        {bookingStatusLabels[item.bookingStatus]}
                      </span>
                      <span className={styles.paymentSubStatus}>
                        {item.paymentStatus
                          ? paymentStatusLabels[item.paymentStatus]
                          : "Chưa lập luồng tiền"}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.holdBadge} ${styles[`hold_${item.holdStatus.toLowerCase()}`]}`}
                      >
                        {holdStatusLabels[item.holdStatus]}
                      </span>
                      {item.holdExpiredAt && (
                        <span className={styles.secondaryCellText}>
                          {formatDateTimeVN(item.holdExpiredAt)}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className={styles.warningTagsList}>
                        {item.warnings.length === 0 ? (
                          <span className={styles.safeIndicator}>
                            ✓ Bình thường
                          </span>
                        ) : (
                          item.warnings.map((w) => (
                            <span key={w} className={styles.warningItemTag}>
                              {warningLabels[w]}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td>
                      <div className={styles.actionButtonsGroup}>
                        <button
                          className={styles.btnView}
                          onClick={() => setSelectedTicket(item)}
                        >
                          Chi tiết
                        </button>

                        {item.bookingStatus === "PENDING" && (
                          <button
                            className={styles.btnApprove}
                            onClick={() => handleConfirmTicket(item)}
                          >
                            Duyệt đơn
                          </button>
                        )}

                        <button
                          className={styles.btnEditStatus}
                          onClick={() => setStatusTicketTarget(item)}
                        >
                          Đổi trạng thái
                        </button>

                        {item.bookingStatus !== "CANCELLED" && (
                          <button
                            className={styles.btnCancel}
                            onClick={() => setCancelTicketTarget(item)}
                          >
                            Hủy đơn
                          </button>
                        )}

                        {item.bookingStatus === "CONFIRMED" && (
                          <button
                            className={styles.btnCheckin}
                            onClick={() => handleCheckinTicket(item)}
                          >
                            Xác nhận Check-in
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

                {data?.items.length === 0 && (
                  <tr>
                    <td colSpan={9} className={styles.noDataCell}>
                      Không tìm thấy bản ghi dữ liệu vé nào khớp với tiêu chí bộ
                      lọc hiện tại.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 6: Thanh điều hướng phân trang */}
        <footer className={styles.paginationBar}>
          <button
            className={styles.pagiArrowBtn}
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Trang trước
          </button>
          <span className={styles.pagiCurrentReport}>
            Đang hiển thị trang <b>{page}</b> / <b>{totalPages}</b>
          </span>
          <button
            className={styles.pagiArrowBtn}
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Trang sau
          </button>
        </footer>
      </div>

      {/* CORE SYSTEM MODALS MODULE INJECTION */}
      <TicketDetailModal
        open={!!selectedTicket}
        ticket={selectedTicket}
        onClose={() => setSelectedTicket(null)}
      />

      <TicketCancelModal
        open={!!cancelTicketTarget}
        ticket={cancelTicketTarget}
        loading={cancelMutation.isPending}
        onClose={() => setCancelTicketTarget(null)}
        onSubmit={(payload) => {
          if (!cancelTicketTarget) return;
          cancelMutation.mutate(
            { bookingId: cancelTicketTarget.bookingId, payload },
            {
              onSuccess: () => {
                toast.success("Đã hoàn tất thủ tục hủy đơn và xử lý ghế");
                setCancelTicketTarget(null);
              },
              onError: (err: any) =>
                toast.error(err.message || "Xử lý hủy thất bại"),
            },
          );
        }}
      />

      <TicketStatusModal
        open={!!statusTicketTarget}
        ticket={statusTicketTarget}
        loading={statusMutation.isPending}
        onClose={() => setStatusTicketTarget(null)}
        onSubmit={(payload) => {
          if (!statusTicketTarget) return;
          statusMutation.mutate(
            { bookingId: statusTicketTarget.bookingId, payload },
            {
              onSuccess: () => {
                toast.success("Thay đổi trạng thái nghiệp vụ thành công");
                setStatusTicketTarget(null);
              },
              onError: (err: any) => toast.error(err.message || "Cập nhật lỗi"),
            },
          );
        }}
      />
      {confirmTicketTarget && (
        <div
          className={styles.confirmOverlay}
          role="presentation"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !statusMutation.isPending
            ) {
              setConfirmTicketTarget(null);
            }
          }}
        >
          <section
            className={styles.confirmModal}
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-ticket-title"
          >
            <div className={styles.confirmIcon}>✓</div>

            <div className={styles.confirmContent}>
              <h2 id="confirm-ticket-title">Xác nhận duyệt đơn</h2>

              <p>
                Bạn có chắc chắn muốn duyệt đơn vé{" "}
                <strong>{confirmTicketTarget.bookingCode}</strong>?
              </p>

              <div className={styles.confirmTicketInfo}>
                <div>
                  <span>Khách hàng</span>
                  <strong>{confirmTicketTarget.customerName}</strong>
                </div>

                <div>
                  <span>Số điện thoại</span>
                  <strong>{confirmTicketTarget.customerPhone}</strong>
                </div>

                <div>
                  <span>Số ghế</span>
                  <strong>{confirmTicketTarget.seatNumbers || "—"}</strong>
                </div>

                <div>
                  <span>Tổng tiền</span>
                  <strong>
                    {formatCurrency(confirmTicketTarget.totalAmount)}
                  </strong>
                </div>
              </div>

              {confirmTicketTarget.paymentStatus !== "PAID" && (
                <div className={styles.confirmWarning}>
                  Đơn chưa được ghi nhận thanh toán. Khi duyệt, hệ thống sẽ đồng
                  thời chuyển thanh toán sang trạng thái đã thanh toán.
                </div>
              )}
            </div>

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.confirmCancelButton}
                disabled={statusMutation.isPending}
                onClick={() => setConfirmTicketTarget(null)}
              >
                Quay lại
              </button>

              <button
                type="button"
                className={styles.confirmApproveButton}
                disabled={statusMutation.isPending}
                onClick={handleSubmitConfirmTicket}
              >
                {statusMutation.isPending ? "Đang xử lý..." : "Xác nhận duyệt"}
              </button>
            </div>
          </section>
        </div>
      )}
      <OfflineTicketModal
        open={isOfflineModalOpen}
        options={options}
        loading={offlineMutation.isPending}
        onClose={() => setIsOfflineModalOpen(false)}
        onSubmit={(payload: CreateOfflineTicketPayload) => {
          offlineMutation.mutate(payload, {
            onSuccess: () => {
              toast.success(
                "Đã khởi tạo vé quầy và quyết toán dòng tiền thành công",
              );
              setIsOfflineModalOpen(false);
            },
            onError: (err: any) =>
              toast.error(err.message || "Không thể tạo vé tại quầy"),
          });
        }}
      />
    </BlockErrorBoundary>
  );
}
