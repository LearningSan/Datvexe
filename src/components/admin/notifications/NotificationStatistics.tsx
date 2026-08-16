"use client";

import {
  Bell,
  BellRing,
  CheckCheck,
  CalendarDays,
} from "lucide-react";

import type {
  AdminNotificationStatistics,
} from "@/types/admin/notifications/notification-management.type";

import styles from "./NotificationStatistics.module.css";

interface Props {
  statistics: AdminNotificationStatistics;
}

export default function NotificationStatistics({
  statistics,
}: Props) {
  const cards = [
    {
      label: "Tổng thông báo",
      value: statistics.total,
      icon: Bell,
      className: styles.total,
    },
    {
      label: "Chưa đọc",
      value: statistics.unread,
      icon: BellRing,
      className: styles.unread,
    },
    {
      label: "Đã đọc",
      value: statistics.read,
      icon: CheckCheck,
      className: styles.read,
    },
    {
      label: "Hôm nay",
      value: statistics.today,
      icon: CalendarDays,
      className: styles.today,
    },
  ];

  return (
    <div className={styles.grid}>
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.label}
            className={styles.card}
          >
            <div className={styles.cardContent}>
              <div>
                <p className={styles.label}>
                  {card.label}
                </p>

                <strong className={styles.value}>
                  {card.value.toLocaleString("vi-VN")}
                </strong>
              </div>

              <div
                className={`${styles.iconWrapper} ${card.className}`}
              >
                <Icon size={20} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
