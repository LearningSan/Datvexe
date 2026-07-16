"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import styles from "./WalletContainer.module.css";

import { useAuthStore } from "@/store/auth.store";
import { useMyWallet } from "@/hooks/client/useWallet";

import type { WalletTransactionItem } from "@/types/client/wallet/wallet.type";

export default function WalletContainer() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const {
    data: wallet,
    isLoading,
    isError,
    error,
    refetch,
  } = useMyWallet(Boolean(user));

  useEffect(() => {
    if (!user) {
      router.replace("/");
    }
  }, [user, router]);

  if (!user) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingWrapper}>
          <div className={styles.spinner}></div>
          <p>Đang kiểm tra tài khoản...</p>
        </div>
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className={styles.page}>
        <div className={styles.loadingWrapper}>
          <div className={styles.spinner}></div>
          <p>Đang tải thông tin ví...</p>
        </div>
      </main>
    );
  }

  if (isError || !wallet) {
    return (
      <main className={styles.page}>
        <div className={styles.errorCard}>
          <div className={styles.errorIcon}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z"
              />
            </svg>
          </div>
          <h3>Không thể tải thông tin ví</h3>
          <p>
            {error instanceof Error
              ? error.message
              : "Đã xảy ra lỗi khi tải dữ liệu ví."}
          </p>
          <button
            type="button"
            className={styles.retryButton}
            onClick={() => {
              void refetch();
            }}
          >
            Thử lại
          </button>
        </div>
      </main>
    );
  }

  const userName = getUserDisplayName(user) || "Khách hàng XeKhachPT";

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        {/* PAGE HEADER */}
        <section className={styles.pageHeader}>
          <div>
            <span className={styles.eyebrow}>TÀI KHOẢN CÁ NHÂN</span>
            <h1>Ví XeKhachPT</h1>
            <p>
              Quản lý số dư, nạp tiền và theo dõi lịch sử giao dịch của bạn dễ
              dàng.
            </p>
          </div>

          <div
            className={`${styles.statusBadge} ${
              wallet.status === "ACTIVE"
                ? styles.statusActive
                : styles.statusLocked
            }`}
          >
            <span className={styles.statusDot}></span>
            {wallet.status === "ACTIVE" ? "Đang hoạt động" : "Đang bị khóa"}
          </div>
        </section>

        {/* OVERVIEW SECTION */}
        <section className={styles.walletOverview}>
          {/* THEME CARD VÍ SANG TRỌNG */}
          <div className={styles.balanceCard}>
            <div className={styles.cardGlow}></div>
            <div className={styles.balanceTop}>
              <div>
                <span className={styles.cardLabel}>Số dư khả dụng</span>
                <strong className={styles.cardBalance}>
                  {formatCurrency(wallet.availableBalance)}
                </strong>
              </div>
              <div className={styles.walletLogo}>
                <span>₫</span>
              </div>
            </div>

            <div className={styles.ownerInfo}>
              <div>
                <span className={styles.cardSubLabel}>Chủ tài khoản</span>
                <strong className={styles.cardValue}>{userName}</strong>
              </div>
              <div>
                <span className={styles.cardSubLabel}>Trạng thái ví</span>
                <strong className={styles.cardValue}>
                  {wallet.status === "ACTIVE" ? "Có thể sử dụng" : "Tạm khóa"}
                </strong>
              </div>
            </div>

            <button
              type="button"
              className={styles.depositButton}
              onClick={() => {
                router.push("/account/wallet/deposit");
              }}
              disabled={wallet.status !== "ACTIVE"}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
                className={styles.btnIcon}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 4.5v15m7.5-7.5h-15"
                />
              </svg>
              Nạp tiền vào ví
            </button>
          </div>

          {/* STATISTICS */}
          <div className={styles.statistics}>
            <article className={styles.statCard}>
              <div className={styles.statHeader}>
                <span>Tổng số dư</span>
                <div className={`${styles.statIcon} ${styles.iconBlue}`}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75 11.25 15 15 9.75"
                    />
                  </svg>
                </div>
              </div>
              <strong>{formatCurrency(wallet.balance)}</strong>
              <small>Số tiền hiện có trong ví</small>
            </article>

            <article className={styles.statCard}>
              <div className={styles.statHeader}>
                <span>Tổng tiền đã nạp</span>
                <div className={`${styles.statIcon} ${styles.iconGreen}`}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
                    />
                  </svg>
                </div>
              </div>
              <strong>{formatCurrency(wallet.totalDeposited)}</strong>
              <small>Giao dịch nạp thành công</small>
            </article>

            <article className={styles.statCard}>
              <div className={styles.statHeader}>
                <span>Đã thanh toán</span>
                <div className={`${styles.statIcon} ${styles.iconOrange}`}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="2"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25v10.5A2.25 2.25 0 0 0 4.5 19.5Z"
                    />
                  </svg>
                </div>
              </div>
              <strong>{formatCurrency(wallet.totalPaid)}</strong>
              <small>Tiền sử dụng để đặt vé</small>
            </article>
          </div>
        </section>

        {/* QUICK ACTIONS */}
        <section className={styles.actionSection}>
          <h2>Chức năng ví</h2>
          <div className={styles.actionGrid}>
            <button
              type="button"
              className={styles.actionCard}
              onClick={() => {
                router.push("/account/wallet/deposit");
              }}
              disabled={wallet.status !== "ACTIVE"}
            >
              <div className={`${styles.actionIcon} ${styles.actionBgPlus}`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
              </div>
              <span className={styles.actionContent}>
                <strong>Nạp tiền</strong>
                <small>Nạp số dư bằng QR PayOS</small>
              </span>
            </button>

            <button
              type="button"
              className={styles.actionCard}
              onClick={() => {
                router.push("/account/wallet/transactions");
              }}
            >
              <div className={`${styles.actionIcon} ${styles.actionBgHistory}`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
                  />
                </svg>
              </div>
              <span className={styles.actionContent}>
                <strong>Lịch sử giao dịch</strong>
                <small>Kiểm tra các giao dịch nạp, thanh toán...</small>
              </span>
            </button>

            <button
              type="button"
              className={styles.actionCard}
              onClick={() => {
                router.push("/account/tickets");
              }}
            >
              <div className={`${styles.actionIcon} ${styles.actionBgTicket}`}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-12v.75m0 3v.75m0 3v.75m0 3V18M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12h.008v.008H16.5V12Zm0 3h.008v.008H16.5V15Zm0-6h.008v.008H16.5V9Zm-9 3h.008v.008H7.5V12Zm0 3h.008v.008H7.5V15Zm0-6h.008v.008H7.5V9ZM3 16.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 16.5M3 16.5V7.5A2.25 2.25 0 0 1 5.25 5.25h13.5A2.25 2.25 0 0 1 21 7.5v9"
                  />
                </svg>
              </div>
              <span className={styles.actionContent}>
                <strong>Vé đã thanh toán</strong>
                <small>Xem danh sách vé đã mua</small>
              </span>
            </button>
          </div>
        </section>

        {/* RECENT TRANSACTIONS */}
        <section className={styles.transactionSection}>
          <div className={styles.sectionHeading}>
            <div>
              <h2>Giao dịch gần đây</h2>
              <p>Các thay đổi số dư mới nhất của ví.</p>
            </div>

            <button
              type="button"
              className={styles.viewAllButton}
              onClick={() => {
                router.push("/account/wallet/transactions");
              }}
            >
              Xem tất cả
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2.5"
                stroke="currentColor"
                className={styles.arrowIcon}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"
                />
              </svg>
            </button>
          </div>

          {wallet.recentTransactions.length > 0 ? (
            <div className={styles.transactionList}>
              {wallet.recentTransactions.map((transaction) => (
                <WalletTransactionRow
                  key={transaction.walletTransactionId}
                  transaction={transaction}
                />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.008 1.24l.885 1.77a2.25 2.25 0 0 0 2.007 1.24h1.98a2.25 2.25 0 0 0 2.007-1.24l.885-1.77a2.25 2.25 0 0 1 2.007-1.24h3.86m-18 0h18m-18 0V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v6m-18 0v5.25a2.25 2.25 0 0 0 2.25 2.25h13.5a2.25 2.25 0 0 0 2.25-2.25V13.5"
                  />
                </svg>
              </div>
              <h3>Chưa có giao dịch</h3>
              <p>
                Sau khi nạp tiền hoặc thanh toán vé bằng ví, giao dịch sẽ xuất
                hiện tại đây.
              </p>
            </div>
          )}
        </section>

        {/* GUIDELINE INFORMATION */}
        <section className={styles.informationBox}>
          <div className={styles.infoTitle}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className={styles.infoIcon}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z"
              />
            </svg>
            <strong>Ví nội bộ hoạt động như thế nào?</strong>
          </div>
          <p>
            Tiền chỉ được cộng vào ví sau khi cổng PayOS xác nhận giao dịch nạp
            thành công. Khi thanh toán vé, hệ thống kiểm tra số dư và trừ tiền
            trong một transaction để tránh sai lệch hoặc thanh toán trùng.
          </p>
        </section>
      </div>
    </main>
  );
}

function WalletTransactionRow({
  transaction,
}: {
  transaction: WalletTransactionItem;
}) {
  const isIncrease =
    transaction.transactionType === "DEPOSIT" ||
    transaction.transactionType === "REFUND";

  return (
    <article className={styles.transactionRow}>
      <div
        className={`${styles.transactionRowIcon} ${
          isIncrease ? styles.rowIconIncrease : styles.rowIconDecrease
        }`}
      >
        {isIncrease ? (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="3"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
            />
          </svg>
        ) : (
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="3"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 13.5 12 21m0 0-7.5-7.5M12 21V3"
            />
          </svg>
        )}
      </div>

      <div className={styles.transactionMain}>
        <strong>{getTransactionTitle(transaction)}</strong>
        <span className={styles.transactionDesc}>
          {transaction.description || transaction.referenceCode}
        </span>
        <small className={styles.transactionDate}>
          {formatDateTime(transaction.createdAt)}
        </small>
      </div>

      <div className={styles.transactionAmountBox}>
        <strong
          className={
            isIncrease ? styles.transactionIncrease : styles.transactionDecrease
          }
        >
          {isIncrease ? "+" : "-"}
          {formatCurrency(transaction.amount)}
        </strong>
        <span className={styles.balanceAfter}>
          Số dư sau: {formatCurrency(transaction.balanceAfter)}
        </span>
      </div>
    </article>
  );
}

function getTransactionTitle(transaction: WalletTransactionItem) {
  switch (transaction.transactionType) {
    case "DEPOSIT":
      return "Nạp tiền vào ví";

    case "PAYMENT":
      return transaction.bookingCode
        ? `Thanh toán vé ${transaction.bookingCode}`
        : "Thanh toán bằng ví";

    case "REFUND":
      return transaction.bookingCode
        ? `Hoàn tiền vé ${transaction.bookingCode}`
        : "Hoàn tiền vào ví";

    case "ADJUSTMENT":
      return "Điều chỉnh số dư";

    default:
      return "Giao dịch ví";
  }
}

function getUserDisplayName(user: unknown): string {
  if (typeof user !== "object" || user === null) {
    return "";
  }

  const record = user as Record<string, unknown>;

  const candidates = [
    record.fullName,
    record.full_name,
    record.name,
    record.email,
  ];

  const value = candidates.find(
    (item) => typeof item === "string" && item.trim().length > 0,
  );

  return typeof value === "string" ? value.trim() : "";
}

function formatCurrency(value: number) {
  return `${Number(value).toLocaleString("vi-VN")} đ`;
}

function formatDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
