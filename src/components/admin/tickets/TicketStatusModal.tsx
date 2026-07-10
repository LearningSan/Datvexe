"use client";

import { useEffect, useState } from "react";
import type { AdminTicketItem, BookingStatus } from "@/types/admin/tickets/ticket-management.type";
import styles from "./TicketActionModal.module.css";

interface Props {
  open: boolean;
  ticket: AdminTicketItem | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: { status: BookingStatus; reason?: string; markPaymentPaid?: boolean }) => void;
}

export default function TicketStatusModal({ open, ticket, loading, onClose, onSubmit }: Props) {
  const [status, setStatus] = useState<BookingStatus>("CONFIRMED");
  const [reason, setReason] = useState("");
  const [markPaymentPaid, setMarkPaymentPaid] = useState(true);

  useEffect(() => {
    if (ticket) {
      setStatus(ticket.bookingStatus);
      setReason("");
      setMarkPaymentPaid(ticket.paymentStatus !== "PAID");
    }
  }, [ticket]);

  if (!open || !ticket) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Cập nhật trạng thái vé</h2>
          <button onClick={onClose}>×</button>
        </div>

        <div className={styles.body}>
          <p className={styles.info}>Booking: <strong>{ticket.bookingCode}</strong></p>

          <label>
            Trạng thái mới
            <select value={status} onChange={(e) => setStatus(e.target.value as BookingStatus)}>
              <option value="PENDING">PENDING - Đang chờ</option>
              <option value="CONFIRMED">CONFIRMED - Đã xác nhận</option>
              <option value="CANCELLED">CANCELLED - Đã hủy</option>
              <option value="REFUNDED">REFUNDED - Đã hoàn tiền</option>
            </select>
          </label>

          <label>
            Lý do / ghi chú xử lý
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Nhập lý do khi hủy, hoàn tiền hoặc điều chỉnh trạng thái..." />
          </label>

          {status === "CONFIRMED" && (
            <label className={styles.checkLine}>
              <input type="checkbox" checked={markPaymentPaid} onChange={(e) => setMarkPaymentPaid(e.target.checked)} />
              Đồng thời đánh dấu giao dịch mới nhất là PAID
            </label>
          )}

          <div className={styles.actions}>
            <button onClick={onClose}>Đóng</button>
            <button
              disabled={loading}
              onClick={() => onSubmit({ status, reason: reason || undefined, markPaymentPaid })}
            >
              {loading ? "Đang lưu..." : "Cập nhật"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
