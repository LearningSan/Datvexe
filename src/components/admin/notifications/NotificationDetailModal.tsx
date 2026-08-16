"use client";

import { useEffect } from "react";
import {
  Ticket,
  CreditCard,
  Bus,
  Bell,
  CheckCircle2,
  Clock,
  Mail,
  Phone,
  User,
  X,
  Calendar,
} from "lucide-react";

import type { AdminNotificationItem } from "@/types/admin/notifications/notification-management.type";
import styles from "./NotificationDetailModal.module.css";

interface Props {
  notification: AdminNotificationItem;
  onClose: () => void;
}

function getTypeBadge(type: AdminNotificationItem["notificationType"]) {
  switch (type) {
    case "BOOKING":
      return {
        label: "Đặt vé",
        icon: <Ticket size={14} />,
        className: styles.badgeBooking,
      };
    case "PAYMENT":
      return {
        label: "Thanh toán",
        icon: <CreditCard size={14} />,
        className: styles.badgePayment,
      };
    case "TRIP":
      return {
        label: "Chuyến xe",
        icon: <Bus size={14} />,
        className: styles.badgeTrip,
      };
    default:
      return {
        label: type,
        icon: <Bell size={14} />,
        className: styles.badgeDefault,
      };
  }
}

export default function NotificationDetailModal({
  notification,
  onClose,
}: Props) {
  // Lấy chữ cái đầu làm avatar đại diện
  const avatarLetter = notification.userFullName
    ? notification.userFullName.charAt(0).toUpperCase()
    : "U";

  const typeBadge = getTypeBadge(notification.notificationType);

  // Đóng modal bằng phím ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div
      className={styles.overlay}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className={styles.modal}>
        {/* Header */}
        <div className={styles.header}>
          <div>
            <h2 id="modal-title" className={styles.title}>
              Chi tiết thông báo
            </h2>
            <p className={styles.subtitle}>
              Mã ID: #{notification.notificationId || "N/A"}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={styles.closeBtn}
            aria-label="Đóng modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className={styles.content}>
          {/* Section: Thẻ thông tin người nhận */}
          <div className={styles.userCard}>
            <div className={styles.avatar}>{avatarLetter}</div>
            <div className={styles.userInfo}>
              <div className={styles.userName}>
                <User size={15} className={styles.metaIcon} />
                <span>{notification.userFullName}</span>
              </div>
              <div className={styles.userContact}>
                {notification.userEmail && (
                  <span className={styles.contactItem}>
                    <Mail size={13} /> {notification.userEmail}
                  </span>
                )}
                {notification.userPhone && (
                  <span className={styles.contactItem}>
                    <Phone size={13} /> {notification.userPhone}
                  </span>
                )}
                {!notification.userEmail && !notification.userPhone && (
                  <span className={styles.noContact}>
                    Không có thông tin liên hệ
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Section: Phân loại & Trạng thái */}
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Loại thông báo</span>
              <div className={`${styles.badge} ${typeBadge.className}`}>
                {typeBadge.icon}
                <span>{typeBadge.label}</span>
              </div>
            </div>

            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Trạng thái</span>
              {notification.isRead ? (
                <div className={`${styles.badge} ${styles.badgeRead}`}>
                  <CheckCircle2 size={14} />
                  <span>Đã đọc</span>
                </div>
              ) : (
                <div className={`${styles.badge} ${styles.badgeUnread}`}>
                  <Clock size={14} />
                  <span>Chưa đọc</span>
                </div>
              )}
            </div>
          </div>

          {/* Section: Nội dung chính */}
          <div className={styles.messageSection}>
            <span className={styles.metaLabel}>Tiêu đề</span>
            <div className={styles.messageTitle}>{notification.title}</div>

            <span className={styles.metaLabel} style={{ marginTop: 12 }}>
              Nội dung chi tiết
            </span>
            <div className={styles.messageContent}>{notification.content}</div>
          </div>

          {/* Section: Thời gian */}
          <div className={styles.timeSection}>
            <Calendar size={14} className={styles.timeIcon} />
            <span>Ngày tạo:</span>
            <strong>
              {new Date(notification.createdAt).toLocaleString("vi-VN", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </strong>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button
            type="button"
            onClick={onClose}
            className={styles.closeButton}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
