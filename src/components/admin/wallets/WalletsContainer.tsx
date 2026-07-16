"use client";

import { useMemo, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { Lock, Search, Unlock, Wallet, Loader2 } from "lucide-react";

import {
  useAdjustAdminWallet,
  useAdminWallets,
  useUpdateAdminWalletStatus,
} from "@/hooks/admin/useWallets";

import { formatCurrency, formatDateTimeVN } from "@/lib/client/helpers";
import BlockSkeleton from "@/components/common/BlockSkeleton";
import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";

import type {
  AdminWalletItem,
  AdminWalletStatus,
} from "@/types/admin/wallets/wallet-management.type";

import styles from "./WalletsContainer.module.css";

const LIMIT = 10;

export default function WalletsContainer() {
  const [keyword, setKeyword] = useState("");
  const [appliedKeyword, setAppliedKeyword] = useState("");
  const [status, setStatus] = useState<"" | AdminWalletStatus>("");
  const [appliedStatus, setAppliedStatus] = useState<"" | AdminWalletStatus>(
    "",
  );
  const [page, setPage] = useState(1);

  // States quản lý Modal thay thế window.prompt
  const [activeModal, setActiveModal] = useState<"STATUS" | "ADJUST" | null>(
    null,
  );
  const [selectedWallet, setSelectedWallet] = useState<AdminWalletItem | null>(
    null,
  );

  // State phục vụ Modal Đổi trạng thái
  const [statusReason, setStatusReason] = useState("");

  // State phục vụ Modal Điều chỉnh số dư
  const [adjustDirection, setAdjustDirection] = useState<
    "INCREASE" | "DECREASE"
  >("INCREASE");
  const [adjustAmount, setAdjustAmount] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const walletsQuery = useAdminWallets({
    keyword: appliedKeyword,
    status: appliedStatus || undefined,
    page,
    limit: LIMIT,
  });

  const statusMutation = useUpdateAdminWalletStatus();
  const adjustmentMutation = useAdjustAdminWallet();

  const totalPage = useMemo(
    () => Math.max(1, Math.ceil((walletsQuery.data?.total ?? 0) / LIMIT)),
    [walletsQuery.data?.total],
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

  // Mở Modal Trạng thái
  function openStatusModal(wallet: AdminWalletItem) {
    setSelectedWallet(wallet);
    setStatusReason("");
    setActiveModal("STATUS");
  }

  // Submit Thay đổi trạng thái
  function handleConfirmStatus() {
    if (!selectedWallet) return;
    if (!statusReason.trim()) {
      toast.error("Vui lòng nhập lý do");
      return;
    }

    const nextStatus: AdminWalletStatus =
      selectedWallet.status === "ACTIVE" ? "LOCKED" : "ACTIVE";

    statusMutation.mutate(
      {
        walletId: selectedWallet.walletId,
        payload: {
          status: nextStatus,
          reason: statusReason.trim(),
        },
      },
      {
        onSuccess: () => {
          toast.success(
            nextStatus === "LOCKED"
              ? "Đã khóa ví thành công"
              : "Đã mở khóa ví thành công",
          );
          closeModals();
        },
        onError: (error) =>
          toast.error(
            error instanceof Error ? error.message : "Không thể cập nhật ví",
          ),
      },
    );
  }

  // Mở Modal Điều chỉnh
  function openAdjustModal(wallet: AdminWalletItem) {
    setSelectedWallet(wallet);
    setAdjustDirection("INCREASE");
    setAdjustAmount("");
    setAdjustReason("");
    setActiveModal("ADJUST");
  }

  // Submit Điều chỉnh số dư
  function handleConfirmAdjustment() {
    if (!selectedWallet) return;

    const amountNum = Number(adjustAmount);
    if (!adjustAmount || !Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error("Số tiền điều chỉnh không hợp lệ");
      return;
    }

    if (!adjustReason.trim()) {
      toast.error("Vui lòng nhập lý do điều chỉnh");
      return;
    }

    adjustmentMutation.mutate(
      {
        walletId: selectedWallet.walletId,
        payload: {
          adjustmentType: adjustDirection,
          amount: amountNum,
          reason: adjustReason.trim(),
        },
      },
      {
        onSuccess: () => {
          toast.success("Điều chỉnh số dư thành công");
          closeModals();
        },
        onError: (error) =>
          toast.error(
            error instanceof Error
              ? error.message
              : "Không thể điều chỉnh số dư",
          ),
      },
    );
  }

  function closeModals() {
    setActiveModal(null);
    setSelectedWallet(null);
  }

  if (walletsQuery.isLoading) {
    return <BlockSkeleton height={500} />;
  }

  return (
    <BlockErrorBoundary fallback={<BlockSkeleton height={500} />}>
      <Toaster position="top-right" />

      <div className={styles.dashboard}>
        {/* HEADER */}
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>Quản lý tài chính</span>
            <h1>Quản Lý Ví Nội Bộ</h1>
            <p>
              Theo dõi số dư, lịch sử nạp tiền, thanh toán và kiểm soát trạng
              thái ví của khách hàng toàn hệ thống.
            </p>
          </div>
        </header>

        {/* METRICS */}
        <section className={styles.metrics}>
          <Metric
            label="Tổng số ví"
            value={walletsQuery.data?.summary.totalWallets ?? 0}
          />
          <Metric
            label="Ví đang hoạt động"
            value={walletsQuery.data?.summary.activeWallets ?? 0}
            active
          />
          <Metric
            label="Ví đang khóa"
            value={walletsQuery.data?.summary.lockedWallets ?? 0}
            locked
          />
          <Metric
            label="Tổng số dư hệ thống"
            value={formatCurrency(walletsQuery.data?.summary.totalBalance ?? 0)}
            isAmount
          />
          <Metric
            label="Tổng tiền đã nạp"
            value={formatCurrency(
              walletsQuery.data?.summary.totalDeposited ?? 0,
            )}
            isAmount
          />
        </section>

        {/* FILTER BAR */}
        <section className={styles.filters}>
          <div className={styles.searchInput}>
            <Search size={18} />
            <input
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleApplyFilter();
              }}
              placeholder="Tìm tên, email, SĐT, mã ví..."
            />
          </div>

          <select
            value={status}
            onChange={(e) =>
              setStatus(e.target.value as "" | AdminWalletStatus)
            }
            className={styles.select}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="ACTIVE">Đang hoạt động</option>
            <option value="LOCKED">Đang khóa</option>
          </select>

          <div className={styles.filterActions}>
            <button
              type="button"
              onClick={handleApplyFilter}
              className={styles.btnPrimary}
            >
              Tìm kiếm
            </button>
            <button
              type="button"
              onClick={handleResetFilter}
              className={styles.btnSecondary}
            >
              Xóa lọc
            </button>
          </div>
        </section>

        {/* CARDS LIST */}
        <section className={styles.walletGrid}>
          {(walletsQuery.data?.items ?? []).map((wallet) => (
            <article key={wallet.walletId} className={styles.walletCard}>
              <div className={styles.walletHeader}>
                <div className={styles.walletIcon}>
                  <Wallet size={20} />
                </div>
                <div className={styles.walletTitle}>
                  <strong>{wallet.fullName}</strong>
                  <span>ID: #{wallet.walletId}</span>
                </div>
                <span
                  className={`${styles.statusBadge} ${
                    wallet.status === "ACTIVE" ? styles.active : styles.locked
                  }`}
                >
                  {wallet.status === "ACTIVE" ? "Đang hoạt động" : "Đang khóa"}
                </span>
              </div>

              <div className={styles.balance}>
                <span>Số dư hiện tại</span>
                <strong>{formatCurrency(wallet.balance)}</strong>
              </div>

              <div className={styles.walletInfo}>
                <div className={styles.infoRow}>
                  <span>Email</span>
                  <strong title={wallet.email}>{wallet.email}</strong>
                </div>
                <div className={styles.infoRow}>
                  <span>Số điện thoại</span>
                  <strong>{wallet.phone || "Chưa cập nhật"}</strong>
                </div>
                <div className={styles.infoRow}>
                  <span>Tổng đã nạp</span>
                  <strong className={styles.txtSuccess}>
                    {formatCurrency(wallet.totalDeposited)}
                  </strong>
                </div>
                <div className={styles.infoRow}>
                  <span>Đã thanh toán</span>
                  <strong className={styles.txtDanger}>
                    {formatCurrency(wallet.totalPaid)}
                  </strong>
                </div>
                <div className={styles.infoRow}>
                  <span>Số giao dịch</span>
                  <strong>{wallet.transactionCount}</strong>
                </div>
                <div className={styles.infoRow}>
                  <span>Cập nhật lúc</span>
                  <strong>{formatDateTimeVN(wallet.updatedAt)}</strong>
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  onClick={() => openStatusModal(wallet)}
                  disabled={statusMutation.isPending}
                  className={
                    wallet.status === "ACTIVE"
                      ? styles.btnLock
                      : styles.btnUnlock
                  }
                >
                  {statusMutation.isPending &&
                  selectedWallet?.walletId === wallet.walletId ? (
                    <Loader2 size={15} className={styles.spin} />
                  ) : wallet.status === "ACTIVE" ? (
                    <Lock size={15} />
                  ) : (
                    <Unlock size={15} />
                  )}
                  {wallet.status === "ACTIVE" ? "Khóa ví" : "Mở khóa"}
                </button>

                <button
                  type="button"
                  onClick={() => openAdjustModal(wallet)}
                  disabled={adjustmentMutation.isPending}
                  className={styles.btnAdjust}
                >
                  Điều chỉnh số dư
                </button>
              </div>
            </article>
          ))}
        </section>

        {/* EMPTY STATE */}
        {!walletsQuery.data?.items.length && (
          <div className={styles.empty}>
            <p>Không tìm thấy ví nào phù hợp với bộ lọc tìm kiếm.</p>
          </div>
        )}

        {/* PAGINATION */}
        <footer className={styles.pagination}>
          <button
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Trang trước
          </button>
          <span>
            Trang <strong>{page}</strong> trên <strong>{totalPage}</strong>
          </span>
          <button
            disabled={page >= totalPage}
            onClick={() => setPage((current) => current + 1)}
          >
            Trang sau
          </button>
        </footer>
      </div>

      {/* MODAL THAY ĐỔI TRẠNG THÁI (LOCK/UNLOCK) */}
      {activeModal === "STATUS" && selectedWallet && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>
                {selectedWallet.status === "ACTIVE"
                  ? "Khóa ví khách hàng"
                  : "Mở khóa ví khách hàng"}
              </h3>
              <p>
                Khách hàng: <strong>{selectedWallet.fullName}</strong>
              </p>
            </div>
            <div className={styles.modalBody}>
              <label>
                Lý do thực hiện <span className={styles.required}>*</span>
              </label>
              <textarea
                value={statusReason}
                onChange={(e) => setStatusReason(e.target.value)}
                placeholder={
                  selectedWallet.status === "ACTIVE"
                    ? "Nhập lý do khóa ví (ví dụ: Vi phạm điều khoản, Phát hiện nghi vấn...)"
                    : "Nhập lý do mở khóa ví..."
                }
                rows={3}
              />
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={closeModals}
                className={styles.btnCancel}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmStatus}
                disabled={statusMutation.isPending}
                className={
                  selectedWallet.status === "ACTIVE"
                    ? styles.btnConfirmDanger
                    : styles.btnConfirmSuccess
                }
              >
                {statusMutation.isPending && (
                  <Loader2 size={16} className={styles.spin} />
                )}
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ĐIỀU CHỈNH SỐ DƯ */}
      {activeModal === "ADJUST" && selectedWallet && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>Điều Chỉnh Số Dư</h3>
              <p>
                Ví của: <strong>{selectedWallet.fullName}</strong>
              </p>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGroup}>
                <label>Hình thức điều chỉnh</label>
                <div className={styles.radioGroup}>
                  <label
                    className={
                      adjustDirection === "INCREASE" ? styles.radioActive : ""
                    }
                  >
                    <input
                      type="radio"
                      name="direction"
                      checked={adjustDirection === "INCREASE"}
                      onChange={() => setAdjustDirection("INCREASE")}
                    />
                    Cộng tiền (+)
                  </label>
                  <label
                    className={
                      adjustDirection === "DECREASE" ? styles.radioActive : ""
                    }
                  >
                    <input
                      type="radio"
                      name="direction"
                      checked={adjustDirection === "DECREASE"}
                      onChange={() => setAdjustDirection("DECREASE")}
                    />
                    Trừ tiền (-)
                  </label>
                </div>
              </div>

              <div className={styles.formGroup}>
                <label>
                  Số tiền điều chỉnh (VND){" "}
                  <span className={styles.required}>*</span>
                </label>
                <input
                  type="number"
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(e.target.value)}
                  placeholder="Ví dụ: 100000"
                  min="1"
                />
              </div>

              <div className={styles.formGroup}>
                <label>
                  Lý do điều chỉnh <span className={styles.required}>*</span>
                </label>
                <textarea
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="Ghi rõ lý do điều chỉnh để lưu lịch sử..."
                  rows={3}
                />
              </div>
            </div>
            <div className={styles.modalFooter}>
              <button
                type="button"
                onClick={closeModals}
                className={styles.btnCancel}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmAdjustment}
                disabled={adjustmentMutation.isPending}
                className={styles.btnConfirmPrimary}
              >
                {adjustmentMutation.isPending && (
                  <Loader2 size={16} className={styles.spin} />
                )}
                Cập nhật số dư
              </button>
            </div>
          </div>
        </div>
      )}
    </BlockErrorBoundary>
  );
}

function Metric({
  label,
  value,
  active,
  locked,
  isAmount,
}: {
  label: string;
  value: string | number;
  active?: boolean;
  locked?: boolean;
  isAmount?: boolean;
}) {
  return (
    <article
      className={`${styles.metric} ${isAmount ? styles.metricAmount : ""}`}
    >
      <span className={styles.metricLabel}>{label}</span>
      <strong
        className={`${styles.metricValue} ${active ? styles.txtSuccess : ""} ${locked ? styles.txtDanger : ""}`}
      >
        {value}
      </strong>
    </article>
  );
}
