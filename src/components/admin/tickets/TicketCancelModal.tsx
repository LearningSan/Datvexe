"use client";

import { useState } from "react";
import type { AdminTicketItem } from "@/types/admin/tickets/ticket-management.type";
import styles from "./TicketActionModal.module.css";

interface Props {
  open: boolean;
  ticket: AdminTicketItem | null;
  loading?: boolean;
  onClose: () => void;
  onSubmit: (payload: { reason: string; refundRequired: boolean; notifyCustomer: boolean }) => void;
}

export default function TicketCancelModal({ open, ticket, loading, onClose, onSubmit }: Props) {
  const [reason, setReason] = useState("");
  const [refundRequired, setRefundRequired] = useState(false);
  const [notifyCustomer, setNotifyCustomer] = useState(true);

  if (!open || !ticket) return null;

  return (
    <div className={styles.backdrop}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>Hủy vé</h2>
          <button onClick={onClose}>×</button>
        </div>

        <div className={styles.body}>
          <p className={styles.warning}>Hủy vé sẽ cập nhật trạng thái, giải phóng ghế, hủy giữ chỗ còn hiệu lực và ghi lịch sử xử lý.</p>
          <p className={styles.info}>Booking: <strong>{ticket.bookingCode}</strong></p>

          <label>
            Lý do hủy *
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="VD: Khách yêu cầu hủy vé, giữ chỗ hết hạn..." />
          </label>

          <label className={styles.checkLine}>
            <input type="checkbox" checked={refundRequired} onChange={(e) => setRefundRequired(e.target.checked)} />
            Vé cần xử lý hoàn tiền
          </label>

          <label className={styles.checkLine}>
            <input type="checkbox" checked={notifyCustomer} onChange={(e) => setNotifyCustomer(e.target.checked)} />
            Gửi thông báo cho khách
          </label>

          <div className={styles.actions}>
            <button onClick={onClose}>Đóng</button>
            <button
              disabled={loading || reason.trim().length < 3}
              onClick={() => onSubmit({ reason, refundRequired, notifyCustomer })}
            >
              {loading ? "Đang hủy..." : "Xác nhận hủy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
