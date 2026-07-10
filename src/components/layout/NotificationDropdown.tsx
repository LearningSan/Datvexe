"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./NotificationDropdown.module.css";
import {
  useNotifications,
  useMarkAllNotificationsAsRead,
  useMarkNotificationAsRead,
} from "@/hooks/client/useNotifications";

const notificationMeta = {
  BOOKING: { label: "Đặt vé", icon: "🎫", className: "badgeBooking" },
  PAYMENT: { label: "Thanh toán", icon: "💳", className: "badgePayment" },
  TRIP: { label: "Chuyến xe", icon: "🚌", className: "badgeTrip" },
} as const;

export default function NotificationDropdown() {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useNotifications(true);
  const { mutate: markRead } = useMarkNotificationAsRead();
  const { mutate: markAllRead, isPending: markingAll } =
    useMarkAllNotificationsAsRead();

  const items = data?.items ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleRead = (notificationId: number, isRead: boolean) => {
    if (!isRead) markRead(notificationId);
  };

  const handleMarkAllRead = () => {
    if (unreadCount > 0) markAllRead();
  };

  return (
    <div className={styles.notificationBox} ref={dropdownRef}>
      <button
        className={`${styles.notificationBtn} ${open ? styles.activeBtn : ""}`}
        onClick={() => setOpen((prev) => !prev)}
        type="button"
        aria-label="Thông báo"
      >
        <span className={styles.bellIcon}>🔔</span>

        {unreadCount > 0 && (
          <span className={styles.notificationBadge}>
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className={styles.notificationMenu}>
          <div className={styles.notificationHeader}>
            <strong>Thông báo ({unreadCount})</strong>

            {unreadCount > 0 && (
              <button
                className={styles.markAllBtn}
                onClick={handleMarkAllRead}
                disabled={markingAll}
                type="button"
              >
                {markingAll ? "Đang xử lý..." : "Đọc tất cả"}
              </button>
            )}
          </div>

          <div className={styles.notificationList}>
            {isLoading ? (
              <div className={styles.notificationCenterState}>
                <div className={styles.spinner}></div>
                <p>Đang tải thông báo...</p>
              </div>
            ) : items.length === 0 ? (
              <div className={styles.notificationCenterState}>
                <span className={styles.emptyIcon}>📭</span>
                <p>Bạn chưa có thông báo nào</p>
              </div>
            ) : (
              items.map((item) => {
                const meta =
                  notificationMeta[item.type as keyof typeof notificationMeta];

                return (
                  <button
                    key={item.notificationId}
                    className={`${styles.notificationItem} ${
                      !item.isRead ? styles.notificationUnread : ""
                    }`}
                    onClick={() => handleRead(item.notificationId, item.isRead)}
                    type="button"
                  >
                    <div className={styles.itemHeader}>
                      <span
                        className={`${styles.typeBadge} ${
                          styles[meta?.className ?? "badgeSystem"]
                        }`}
                      >
                        {meta?.icon ?? "🔔"} {meta?.label ?? "Hệ thống"}
                      </span>

                      {!item.isRead && <span className={styles.unreadDot} />}
                    </div>

                    <div className={styles.notificationTitle}>{item.title}</div>

                    <div className={styles.notificationContent}>
                      {item.content}
                    </div>

                    <div className={styles.notificationTime}>
                      {new Date(item.createdAt).toLocaleString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                      })}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
