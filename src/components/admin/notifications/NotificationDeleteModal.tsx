"use client";

import { useEffect } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import type { AdminNotificationItem } from "@/types/admin/notifications/notification-management.type";

import styles from "./NotificationDeleteModal.module.css";

interface Props {
  notification: AdminNotificationItem;
  loading: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export default function NotificationDeleteModal({
  notification,
  loading,
  onCancel,
  onConfirm,
}: Props) {
  // Đóng modal khi nhấn phím Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        onCancel();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading, onCancel]);

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !loading) {
          onCancel();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={styles.modal}>
        {/* Nút đóng nhanh ở góc */}
        <button
          type="button"
          className={styles.closeButton}
          onClick={onCancel}
          disabled={loading}
          aria-label="Đóng"
        >
          <X size={18} />
        </button>

        {/* Header Visual */}
        <div className={styles.iconWrapper}>
          <AlertTriangle className={styles.icon} size={28} />
        </div>

        {/* Nội dung tin nhắn */}
        <div className={styles.content}>
          <h2 id="modal-title" className={styles.title}>
            Xóa thông báo?
          </h2>

          <p className={styles.description}>
            Bạn có chắc chắn muốn xóa thông báo{" "}
            <span className={styles.notificationTitle}>
              "{notification.title}"
            </span>
            ?
          </p>

          <div className={styles.warningBox}>
            <strong>Lưu ý:</strong> Hành động này sẽ xóa vĩnh viễn và không thể
            hoàn tác.
          </div>
        </div>

        {/* Nút thao tác */}
        <div className={styles.actions}>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className={styles.cancelButton}
          >
            Hủy bỏ
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={styles.deleteButton}
          >
            {loading ? (
              <>
                <Loader2 size={16} className={styles.spinner} />
                <span>Đang xóa...</span>
              </>
            ) : (
              "Xóa thông báo"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
