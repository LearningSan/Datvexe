"use client";

import { useCallback, useMemo, useState } from "react";

import toast, { Toaster } from "react-hot-toast";

import {
  Banknote,
  CheckCircle2,
  Clock3,
  QrCode,
  Search,
  XCircle,
} from "lucide-react";

import {
  useAdminCashPayments,
  useConfirmCashPayment,
  useLookupCashPayment,
} from "@/hooks/admin/useCashPayments";

import CashQrScanner from "./CashQrScanner";

import type { AdminCashPaymentItem } from "@/types/admin/payments/cash-payment.type";

import { formatCurrency, formatDateTimeVN } from "@/lib/client/helpers";

import BlockSkeleton from "@/components/common/BlockSkeleton";
import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";

import styles from "./CashPaymentsContainer.module.css";

const LIMIT = 10;

type CashPaymentFilterStatus =
  | ""
  | "PENDING"
  | "WAITING_CONFIRM"
  | "PAID"
  | "EXPIRED";

export default function CashPaymentsContainer() {
  const [isScannerEnabled, setIsScannerEnabled] = useState(true); // Mặc định luôn bật scanner

  const [lastScannedValue, setLastScannedValue] = useState("");

  const [keyword, setKeyword] = useState("");

  const [appliedKeyword, setAppliedKeyword] = useState("");

  const [status, setStatus] = useState<CashPaymentFilterStatus>("");

  const [appliedStatus, setAppliedStatus] =
    useState<CashPaymentFilterStatus>("");

  const [page, setPage] = useState(1);

  const [scanValue, setScanValue] = useState("");

  const [selectedPayment, setSelectedPayment] =
    useState<AdminCashPaymentItem | null>(null);

  const listQuery = useAdminCashPayments({
    keyword: appliedKeyword,

    status: appliedStatus === "" ? undefined : appliedStatus,

    page,
    limit: LIMIT,
  });

  const lookupMutation = useLookupCashPayment();

  const confirmMutation = useConfirmCashPayment();

  const totalPage = useMemo(
    () => Math.max(1, Math.ceil((listQuery.data?.total ?? 0) / LIMIT)),
    [listQuery.data?.total],
  );

  const lookupTransaction = useCallback(
    (rawValue: string) => {
      const value = rawValue.trim();

      if (!value) {
        toast.error("Vui lòng quét hoặc nhập mã giao dịch");
        return;
      }

      if (lookupMutation.isPending) {
        return;
      }

      setScanValue(value);

      lookupMutation.mutate(
        {
          transactionCode: value,
        },
        {
          onSuccess: (payment) => {
            setSelectedPayment(payment);
            setLastScannedValue(value);

            /*
             * Tự động tạm tắt camera khi đã tìm thấy giao dịch để tránh quét lặp.
             * Nhân viên vẫn có thể bật lại thủ công thông qua nút bấm trên CashQrScanner.
             */
            setIsScannerEnabled(false);

            toast.success("Đã tìm thấy giao dịch");
          },

          onError: (error) => {
            setSelectedPayment(null);

            toast.error(
              error instanceof Error
                ? error.message
                : "Không tìm thấy giao dịch",
            );
          },
        },
      );
    },
    [lookupMutation, selectedPayment],
  );

  function handleApplyFilter() {
    setPage(1);
    setAppliedKeyword(keyword.trim());
    setAppliedStatus(status);
  }

  function handleResetFilter() {
    setKeyword("");
    setAppliedKeyword("");

    setStatus("");
    setAppliedStatus("");

    setPage(1);
  }

  function handleLookup() {
    lookupTransaction(scanValue);
  }

  function handleSelectRow(payment: AdminCashPaymentItem) {
    setSelectedPayment(payment);
    setScanValue(payment.transactionCode);
    setLastScannedValue(payment.transactionCode);

    /*
     * Tạm tắt camera khi click xem chi tiết từ dòng trong bảng
     */
    setIsScannerEnabled(false);
  }

  function handleClearPreview() {
    setSelectedPayment(null);
    setScanValue("");
    setLastScannedValue("");
    setIsScannerEnabled(true);
  }

  function handleConfirm(payment: AdminCashPaymentItem) {
    if (payment.paymentStatus === "PAID") {
      toast.error("Giao dịch này đã được thanh toán");
      return;
    }

    const isExpired =
      payment.paymentStatus === "PENDING" &&
      Boolean(payment.holdExpiredAt) &&
      new Date(payment.holdExpiredAt!).getTime() <= Date.now();

    if (isExpired) {
      toast.error("Giao dịch đã hết thời gian giữ chỗ");
      return;
    }

    if (
      !window.confirm(
        `Xác nhận đã thu ${formatCurrency(
          payment.amount,
        )} cho vé ${payment.bookingCode}?`,
      )
    ) {
      return;
    }

    confirmMutation.mutate(
      {
        transactionCode: payment.transactionCode,
      },
      {
        onSuccess: () => {
          toast.success("Đã xác nhận thu tiền thành công");

          setIsScannerEnabled(false);

          window.setTimeout(() => {
            setSelectedPayment(null);
            setScanValue("");
            setLastScannedValue("");
            setIsScannerEnabled(true);
          }, 1800);
        },

        onError: (error) => {
          toast.error(
            error instanceof Error
              ? error.message
              : "Không thể xác nhận thu tiền",
          );
        },
      },
    );
  }

  if (listQuery.isLoading) {
    return <BlockSkeleton height={500} />;
  }

  return (
    <BlockErrorBoundary fallback={<BlockSkeleton height={500} />}>
      <Toaster position="top-right" />

      <div className={styles.dashboard}>
        {/* Header */}
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Quản lý thanh toán</span>
            <h1>Thanh Toán Tại Quầy</h1>
            <p>
              Quét QR của khách, kiểm tra thông tin đặt vé và xác nhận sau khi
              đã thu đủ tiền mặt.
            </p>
          </div>
        </header>

        {/* Metrics */}
        <section className={styles.metrics}>
          <Metric
            icon={<Clock3 size={22} />}
            label="Đang chờ tại quầy"
            value={listQuery.data?.summary.pendingCount ?? 0}
          />
          <Metric
            icon={<QrCode size={22} />}
            label="Chờ nhân viên xác nhận"
            value={listQuery.data?.summary.waitingCount ?? 0}
          />
          <Metric
            icon={<CheckCircle2 size={22} />}
            label="Đã thu tiền hôm nay"
            value={listQuery.data?.summary.paidTodayCount ?? 0}
          />
          <Metric
            icon={<Banknote size={22} />}
            label="Doanh thu tiền mặt"
            value={formatCurrency(listQuery.data?.summary.paidTodayAmount ?? 0)}
          />
          <Metric
            icon={<XCircle size={22} />}
            label="Đã hết hạn"
            value={listQuery.data?.summary.expiredCount ?? 0}
          />
        </section>

        {/* Workspace: Camera & Nhập mã */}
        <section className={styles.topScannerWorkspace}>
          <div className={styles.scannerBox}>
            <CashQrScanner
              enabled={isScannerEnabled}
              onToggleCamera={() => setIsScannerEnabled((prev) => !prev)}
              onDetected={(value) => {
                if (value === lastScannedValue && selectedPayment) {
                  return;
                }
                lookupTransaction(value);
              }}
            />
          </div>

          <div className={styles.manualPanel}>
            <div>
              <h2>Nhập mã thủ công / Tra cứu nhanh</h2>
              <p>Dùng khi camera không hoạt động hoặc mã QR bị mờ.</p>
            </div>

            <div className={styles.scannerInput}>
              <QrCode size={21} />
              <input
                value={scanValue}
                onChange={(event) => setScanValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleLookup();
                  }
                }}
                placeholder="CASH:PAY... hoặc PAY..."
              />
              <button
                type="button"
                onClick={handleLookup}
                disabled={lookupMutation.isPending}
              >
                <Search size={18} />
                {lookupMutation.isPending ? "Đang tìm..." : "Tra cứu"}
              </button>
            </div>
          </div>
        </section>

        {/* Layout chính bên dưới */}
        <div className={styles.mainLayout}>
          {/* Cột Trái: Bộ lọc và Bảng Danh Sách */}
          <div className={styles.tableSection}>
            <section className={styles.filterPanel}>
              <input
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    handleApplyFilter();
                  }
                }}
                placeholder="Tìm mã vé, giao dịch, khách hàng..."
              />

              <select
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as CashPaymentFilterStatus)
                }
              >
                <option value="">Tất cả trạng thái</option>
                <option value="PENDING">Đang chờ thanh toán</option>
                <option value="WAITING_CONFIRM">Chờ xác nhận</option>
                <option value="PAID">Đã thanh toán</option>
                <option value="EXPIRED">Đã hết hạn</option>
              </select>

              <button type="button" onClick={handleApplyFilter}>
                Tìm kiếm
              </button>

              <button type="button" onClick={handleResetFilter}>
                Xóa lọc
              </button>
            </section>

            <section className={styles.tableCard}>
              <table>
                <thead>
                  <tr>
                    <th>Mã vé</th>
                    <th>Khách hàng</th>
                    <th>Tuyến xe</th>
                    <th>Số tiền</th>
                    <th>Trạng thái</th>
                    <th>Thời hạn</th>
                    <th>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {(listQuery.data?.items ?? []).map((item) => (
                    <tr key={item.paymentId}>
                      <td data-label="Mã vé">
                        <strong>{item.bookingCode}</strong>
                        <small>{item.transactionCode}</small>
                      </td>
                      <td data-label="Khách hàng">
                        <strong>{item.customerName}</strong>
                        <small>{item.customerPhone}</small>
                      </td>
                      <td data-label="Tuyến xe">{item.routeName}</td>
                      <td data-label="Số tiền">
                        {formatCurrency(item.amount)}
                      </td>
                      <td data-label="Trạng thái">
                        <StatusBadge item={item} />
                      </td>
                      <td data-label="Thời hạn">
                        {item.holdExpiredAt
                          ? formatDateTimeVN(item.holdExpiredAt)
                          : "-"}
                      </td>
                      <td data-label="Thao tác">
                        <button
                          type="button"
                          className={styles.rowAction}
                          onClick={() => handleSelectRow(item)}
                        >
                          Xem và xác nhận
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!listQuery.data?.items.length && (
                <div className={styles.empty}>
                  Không có giao dịch tiền mặt phù hợp.
                </div>
              )}
            </section>

            <footer className={styles.pagination}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
              >
                Trang trước
              </button>
              <span>
                Trang {page}/{totalPage}
              </span>
              <button
                type="button"
                disabled={page >= totalPage}
                onClick={() => setPage((current) => current + 1)}
              >
                Trang sau
              </button>
            </footer>
          </div>

          {/* Cột Phải: Preview Sidebar */}
          {selectedPayment && (
            <aside className={styles.previewSidebar}>
              <section className={styles.paymentPreview}>
                <div className={styles.previewHeader}>
                  <h3>Chi tiết thanh toán</h3>
                  <button
                    type="button"
                    onClick={handleClearPreview}
                    className={styles.closePreviewBtn}
                  >
                    Đóng
                  </button>
                </div>

                <div>
                  <span>Mã vé</span>
                  <strong>{selectedPayment.bookingCode}</strong>
                </div>

                <div>
                  <span>Khách hàng</span>
                  <strong>{selectedPayment.customerName}</strong>
                  <small>{selectedPayment.customerPhone}</small>
                </div>

                <div>
                  <span>Tuyến xe</span>
                  <strong>{selectedPayment.routeName}</strong>
                  <small>
                    {selectedPayment.departureDatetime
                      ? formatDateTimeVN(selectedPayment.departureDatetime)
                      : "Chưa cập nhật"}
                  </small>
                </div>

                <div>
                  <span>Ghế</span>
                  <strong>
                    {selectedPayment.seatNumbers.length
                      ? selectedPayment.seatNumbers.join(", ")
                      : "Chưa cập nhật"}
                  </strong>
                </div>

                <div>
                  <span>Số tiền cần thu</span>
                  <strong className={styles.previewAmount}>
                    {formatCurrency(selectedPayment.amount)}
                  </strong>
                </div>

                <button
                  type="button"
                  className={styles.confirmButton}
                  disabled={
                    confirmMutation.isPending ||
                    selectedPayment.paymentStatus === "PAID"
                  }
                  onClick={() => handleConfirm(selectedPayment)}
                >
                  <CheckCircle2 size={19} />
                  {selectedPayment.paymentStatus === "PAID"
                    ? "Giao dịch đã thanh toán"
                    : confirmMutation.isPending
                      ? "Đang xác nhận..."
                      : "Xác nhận đã thu tiền"}
                </button>

                <button
                  type="button"
                  className={styles.toggleCameraButton}
                  onClick={handleClearPreview}
                >
                  Quét giao dịch khác
                </button>
              </section>
            </aside>
          )}
        </div>
      </div>
    </BlockErrorBoundary>
  );
}

function Metric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <article className={styles.metric}>
      <div className={styles.metricIcon}>{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </article>
  );
}

function StatusBadge({ item }: { item: AdminCashPaymentItem }) {
  const expired =
    item.paymentStatus === "PENDING" &&
    Boolean(item.holdExpiredAt) &&
    new Date(item.holdExpiredAt!).getTime() <= Date.now();

  const label = expired
    ? "Đã hết hạn"
    : item.paymentStatus === "PAID"
      ? "Đã thanh toán"
      : item.paymentStatus === "WAITING_CONFIRM"
        ? "Chờ xác nhận"
        : "Đang chờ";

  return (
    <span
      className={`${styles.status} ${
        expired
          ? styles.expired
          : item.paymentStatus === "PAID"
            ? styles.paid
            : styles.pending
      }`}
    >
      {label}
    </span>
  );
}