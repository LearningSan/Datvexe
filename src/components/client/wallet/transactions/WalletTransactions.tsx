"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import styles from "./WalletTransactions.module.css";
import { useAuthStore } from "@/store/auth.store";
import { useMyWallet, useWalletTransactions } from "@/hooks/client/useWallet";

import type {
  WalletTransactionItem,
  WalletTransactionType,
} from "@/types/client/wallet/wallet.type";

const PAGE_LIMIT = 10;

type TransactionFilter = WalletTransactionType | "ALL";

const FILTER_OPTIONS: Array<{
  value: TransactionFilter;
  label: string;
}> = [
  { value: "ALL", label: "Tất cả" },
  { value: "DEPOSIT", label: "Nạp tiền" },
  { value: "PAYMENT", label: "Thanh toán" },
  { value: "REFUND", label: "Hoàn tiền" },
  { value: "ADJUSTMENT", label: "Điều chỉnh" },
];

// --- HELPER FUNCTIONS ---

function formatCurrency(value: number) {
  return `${Number(value || 0).toLocaleString("vi-VN")} đ`;
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

function getTransactionTitle(transaction: WalletTransactionItem) {
  switch (transaction.transactionType) {
    case "DEPOSIT":
      return "Nạp tiền vào ví";
    case "PAYMENT":
      return transaction.bookingCode
        ? `Thanh toán vé ${transaction.bookingCode}`
        : "Thanh toán vé bằng ví";
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

function getTransactionTypeLabel(type: WalletTransactionType) {
  switch (type) {
    case "DEPOSIT":
      return "Nạp tiền";
    case "PAYMENT":
      return "Thanh toán";
    case "REFUND":
      return "Hoàn tiền";
    case "ADJUSTMENT":
      return "Điều chỉnh";
    default:
      return "Giao dịch";
  }
}

// --- SUB-COMPONENT ---

interface TransactionRowProps {
  transaction: WalletTransactionItem;
}

function TransactionRow({ transaction }: TransactionRowProps) {
  const isIncrease =
    transaction.transactionType === "DEPOSIT" ||
    transaction.transactionType === "REFUND";

  return (
    <article className={styles.transactionRow}>
      <div
        className={`${styles.transactionIcon} ${
          isIncrease ? styles.increaseIcon : styles.decreaseIcon
        }`}
      >
        {isIncrease ? "+" : "−"}
      </div>

      <div className={styles.transactionMain}>
        <div className={styles.transactionTitle}>
          <strong>{getTransactionTitle(transaction)}</strong>
          <span
            className={`${styles.typeBadge} ${
              isIncrease ? styles.increaseBadge : styles.decreaseBadge
            }`}
          >
            {getTransactionTypeLabel(transaction.transactionType)}
          </span>
        </div>

        <p className={styles.description}>
          {transaction.description || transaction.referenceCode}
        </p>

        <div className={styles.transactionMeta}>
          <span>Mã GD: {transaction.referenceCode}</span>
          {transaction.bookingCode && (
            <span>Mã vé: {transaction.bookingCode}</span>
          )}
          <span>{formatDateTime(transaction.createdAt)}</span>
        </div>
      </div>

      <div className={styles.transactionAmounts}>
        <strong
          className={isIncrease ? styles.increaseAmount : styles.decreaseAmount}
        >
          {isIncrease ? "+" : "−"} {formatCurrency(transaction.amount)}
        </strong>

        <div className={styles.balanceSnapshots}>
          <div>
            <span>Trước:</span>
            <b>{formatCurrency(transaction.balanceBefore)}</b>
          </div>
          <div>
            <span>Sau:</span>
            <b>{formatCurrency(transaction.balanceAfter)}</b>
          </div>
        </div>
      </div>
    </article>
  );
}

// --- MAIN COMPONENT ---

export default function WalletTransactions() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);

  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<TransactionFilter>("ALL");

  const walletQuery = useMyWallet(Boolean(user));
  const transactionsQuery = useWalletTransactions(
    page,
    PAGE_LIMIT,
    Boolean(user),
  );

  useEffect(() => {
    if (!user) {
      router.replace("/");
    }
  }, [user, router]);

  const response = transactionsQuery.data;

  // Lọc dữ liệu client-side nếu API trả về danh sách đầy đủ
  const filteredItems = useMemo(() => {
    const items = response?.items ?? [];
    if (filter === "ALL") {
      return items;
    }
    return items.filter((item) => item.transactionType === filter);
  }, [response?.items, filter]);

  if (!user) {
    return (
      <main className={styles.page}>
        <div className={styles.stateBox}>
          <div className={styles.spinner} />
          <p>Đang kiểm tra tài khoản...</p>
        </div>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <button
          type="button"
          className={styles.backButton}
          onClick={() => router.push("/account/wallet")}
        >
          ← Quay lại ví
        </button>

        <section className={styles.pageHeader}>
          <div>
            <span className={styles.eyebrow}>Ví XeKhachPT</span>
            <h1>Lịch sử giao dịch</h1>
            <p>
              Theo dõi các giao dịch nạp tiền, thanh toán vé, hoàn tiền và điều
              chỉnh số dư.
            </p>
          </div>

          <div className={styles.balanceBox}>
            <span>Số dư hiện tại</span>
            {walletQuery.isLoading ? (
              <strong>Đang tải...</strong>
            ) : (
              <strong>{formatCurrency(walletQuery.data?.balance ?? 0)}</strong>
            )}
          </div>
        </section>

        <section className={styles.contentCard}>
          <div className={styles.filterBar}>
            {FILTER_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`${styles.filterButton} ${
                  filter === option.value ? styles.filterActive : ""
                }`}
                onClick={() => {
                  setFilter(option.value);
                  setPage(1); // Reset trang về 1 khi đổi bộ lọc
                }}
              >
                {option.label}
              </button>
            ))}
          </div>

          {transactionsQuery.isLoading && (
            <div className={styles.stateBox}>
              <div className={styles.spinner} />
              <p>Đang tải lịch sử giao dịch...</p>
            </div>
          )}

          {transactionsQuery.isError && (
            <div className={styles.stateBox}>
              <div className={styles.errorIcon}>!</div>
              <h3>Không thể tải lịch sử giao dịch</h3>
              <p>Hệ thống tạm thời không lấy được dữ liệu ví.</p>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => {
                  void transactionsQuery.refetch();
                }}
              >
                Thử lại
              </button>
            </div>
          )}

          {!transactionsQuery.isLoading &&
            !transactionsQuery.isError &&
            filteredItems.length === 0 && (
              <div className={styles.stateBox}>
                <div className={styles.emptyIcon}>↕</div>
                <h3>Chưa có giao dịch</h3>
                <p>Không có giao dịch phù hợp với bộ lọc hiện tại.</p>
              </div>
            )}

          {!transactionsQuery.isLoading &&
            !transactionsQuery.isError &&
            filteredItems.length > 0 && (
              <div className={styles.transactionList}>
                {filteredItems.map((transaction) => (
                  <TransactionRow
                    key={transaction.walletTransactionId}
                    transaction={transaction}
                  />
                ))}
              </div>
            )}

          {response && response.pagination.totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(current - 1, 1))}
              >
                Trang trước
              </button>

              <span>
                Trang {response.pagination.page} /{" "}
                {response.pagination.totalPages}
              </span>

              <button
                type="button"
                disabled={page >= response.pagination.totalPages}
                onClick={() => setPage((current) => current + 1)}
              >
                Trang sau
              </button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
