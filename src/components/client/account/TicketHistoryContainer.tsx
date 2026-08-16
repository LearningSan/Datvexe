"use client";

import { useState } from "react";

import { useTicketHistory } from "@/hooks/client/useAccount";
import BlockErrorBoundary from "@/components/common/BlockErrorBoundary";
import BlockSkeleton from "@/components/common/BlockSkeleton";
import TicketDetailModal from "./TicketDetailModal";

import styles from "./TicketHistoryContainer.module.css";
const STATUS_TABS = [
  { key: "ALL", label: "Tất cả" },
  { key: "PENDING", label: "Chờ thanh toán" },
  { key: "CONFIRMED", label: "Đã xác nhận" },
  { key: "CANCELLED", label: "Đã hủy" },
  { key: "REFUNDED", label: "Đã hoàn tiền" },
] as const;
export default function TicketHistoryContainer() {
  const [activeStatus, setActiveStatus] = useState("ALL");
  const { data, isLoading } = useTicketHistory();
  const [selectedBookingId, setSelectedBookingId] = useState<number | null>(
    null,
  );

  const getStatusClass = (status: string) => {
    const key = status?.toLowerCase() || "";
    return styles[`status_${key}`] || styles.status_pending;
  };
  const filteredData =
    activeStatus === "ALL"
      ? data
      : data?.filter((ticket) => ticket.status === activeStatus);
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Lịch sử mua vé</h1>
      <div className={styles.tabs}>
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            className={`${styles.tab} ${
              activeStatus === tab.key ? styles.tabActive : ""
            }`}
            onClick={() => setActiveStatus(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <BlockErrorBoundary fallback={<BlockSkeleton height={300} />}>
        {isLoading ? (
          <BlockSkeleton height={300} />
        ) : !filteredData || filteredData.length === 0 ? (
          <div className={styles.emptyState}>
            <p>Bạn chưa thực hiện giao dịch đặt vé nào.</p>
          </div>
        ) : (
          <div className={styles.list}>
            {filteredData?.map((ticket) => (
              <button
                key={ticket.bookingId}
                type="button"
                className={styles.card}
                onClick={() => setSelectedBookingId(ticket.bookingId)}
              >
                <div className={styles.mainInfo}>
                  <div className={styles.codeWrapper}>
                    <span className={styles.bookingCode}>
                      {ticket.bookingCode}
                    </span>

                    <span
                      className={`${styles.statusBadge} ${getStatusClass(
                        ticket.status,
                      )}`}
                    >
                      {ticket.status}
                    </span>
                  </div>

                  <div className={styles.dateTime}>
                    📅 Khởi hành:{" "}
                    {new Date(ticket.departureDateTime).toLocaleString(
                      "vi-VN",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      },
                    )}
                  </div>
                </div>

                <div className={styles.sideInfo}>
                  <span className={styles.priceLabel}>Tổng tiền</span>
                  <span className={styles.price}>
                    {Number(ticket.totalAmount).toLocaleString("vi-VN")}đ
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}
      </BlockErrorBoundary>

      {selectedBookingId && (
        <TicketDetailModal
          bookingId={selectedBookingId}
          onClose={() => setSelectedBookingId(null)}
        />
      )}
    </div>
  );
}
