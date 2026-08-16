"use client";

import {
  Eye,
  Pencil,
  Trash2,
  Ticket,
  CreditCard,
  Bus,
  Bell,
  CheckCircle2,
  Clock,
  Inbox,
} from "lucide-react";

import type { AdminNotificationItem } from "@/types/admin/notifications/notification-management.type";
import styles from "./NotificationTable.module.css";

interface Props {
  items: AdminNotificationItem[];
  loading: boolean;
  onView: (item: AdminNotificationItem) => void;
  onEdit: (item: AdminNotificationItem) => void;
  onDelete: (item: AdminNotificationItem) => void;
  onToggleRead: (item: AdminNotificationItem) => void;
}

function getTypeBadge(type: AdminNotificationItem["notificationType"]) {
  switch (type) {
    case "BOOKING":
      return {
        label: "Đặt vé",
        icon: <Ticket size={13} />,
        className: styles.badgeBooking,
      };
    case "PAYMENT":
      return {
        label: "Thanh toán",
        icon: <CreditCard size={13} />,
        className: styles.badgePayment,
      };
    case "TRIP":
      return {
        label: "Chuyến xe",
        icon: <Bus size={13} />,
        className: styles.badgeTrip,
      };
    default:
      return {
        label: type,
        icon: <Bell size={13} />,
        className: styles.badgeDefault,
      };
  }
}

function formatDate(value: string) {
  if (!value) return "-";
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function NotificationTable({
  items,
  loading,
  onView,
  onEdit,
  onDelete,
  onToggleRead,
}: Props) {
  // Skeleton Loading State
  if (loading) {
    return (
      <div className={styles.wrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: "35%" }}>Thông báo</th>
              <th style={{ width: "20%" }}>Người nhận</th>
              <th style={{ width: "12%" }}>Loại</th>
              <th style={{ width: "13%" }}>Trạng thái</th>
              <th style={{ width: "12%" }}>Ngày tạo</th>
              <th style={{ width: "8%", textAlign: "right" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 5 }).map((_, index) => (
              <tr key={index}>
                <td>
                  <div
                    className={styles.skeletonLine}
                    style={{ width: "60%", height: 16 }}
                  />
                  <div
                    className={styles.skeletonLine}
                    style={{ width: "85%", height: 12, marginTop: 6 }}
                  />
                </td>
                <td>
                  <div
                    className={styles.skeletonLine}
                    style={{ width: "70%", height: 14 }}
                  />
                  <div
                    className={styles.skeletonLine}
                    style={{ width: "50%", height: 12, marginTop: 4 }}
                  />
                </td>
                <td>
                  <div
                    className={styles.skeletonLine}
                    style={{ width: "80px", height: 24, borderRadius: 12 }}
                  />
                </td>
                <td>
                  <div
                    className={styles.skeletonLine}
                    style={{ width: "90px", height: 26, borderRadius: 13 }}
                  />
                </td>
                <td>
                  <div
                    className={styles.skeletonLine}
                    style={{ width: "100px", height: 14 }}
                  />
                </td>
                <td>
                  <div
                    className={styles.skeletonLine}
                    style={{ width: "80px", height: 28, marginLeft: "auto" }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // Empty State
  if (items.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyIconWrapper}>
          <Inbox size={32} />
        </div>
        <h3 className={styles.emptyTitle}>Không tìm thấy thông báo</h3>
        <p className={styles.emptyText}>
          Hiện tại chưa có dữ liệu thông báo nào trong hệ thống.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th style={{ width: "35%" }}>Thông báo</th>
            <th style={{ width: "20%" }}>Người nhận</th>
            <th style={{ width: "12%" }}>Loại</th>
            <th style={{ width: "13%" }}>Trạng thái</th>
            <th style={{ width: "12%" }}>Ngày tạo</th>
            <th style={{ width: "8%", textAlign: "right" }}>Thao tác</th>
          </tr>
        </thead>

        <tbody>
          {items.map((item) => {
            const badge = getTypeBadge(item.notificationType);

            return (
              <tr
                key={item.notificationId}
                className={!item.isRead ? styles.unreadRow : ""}
              >
                <td>
                  <div className={styles.notificationCell}>
                    <div className={styles.titleWrapper}>
                      {!item.isRead && <span className={styles.unreadDot} />}
                      <span className={styles.notificationTitle}>
                        {item.title}
                      </span>
                    </div>
                    <p className={styles.notificationContent}>{item.content}</p>
                  </div>
                </td>

                <td>
                  <div className={styles.userCell}>
                    <span className={styles.userName}>
                      {item.userFullName || "N/A"}
                    </span>
                    <span className={styles.userContact}>
                      {item.userEmail || item.userPhone || "-"}
                    </span>
                  </div>
                </td>

                <td>
                  <div className={`${styles.typeBadge} ${badge.className}`}>
                    {badge.icon}
                    <span>{badge.label}</span>
                  </div>
                </td>

                <td>
                  <button
                    type="button"
                    className={`${styles.statusToggle} ${
                      item.isRead ? styles.statusRead : styles.statusUnread
                    }`}
                    onClick={() => onToggleRead(item)}
                    title="Bấm để đổi trạng thái"
                  >
                    {item.isRead ? (
                      <>
                        <CheckCircle2 size={13} />
                        <span>Đã đọc</span>
                      </>
                    ) : (
                      <>
                        <Clock size={13} />
                        <span>Chưa đọc</span>
                      </>
                    )}
                  </button>
                </td>

                <td>
                  <span className={styles.dateText}>
                    {formatDate(item.createdAt)}
                  </span>
                </td>

                <td>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => onView(item)}
                      title="Xem chi tiết"
                    >
                      <Eye size={15} />
                    </button>

                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => onEdit(item)}
                      title="Chỉnh sửa"
                    >
                      <Pencil size={15} />
                    </button>

                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.deleteBtn}`}
                      onClick={() => onDelete(item)}
                      title="Xóa"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
