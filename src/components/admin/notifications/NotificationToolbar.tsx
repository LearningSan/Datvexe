"use client";

import { useEffect, useState } from "react";
import { Search, X, RotateCcw } from "lucide-react";

import type { AdminNotificationType } from "@/types/admin/notifications/notification-management.type";
import styles from "./NotificationToolbar.module.css";

interface Props {
  keyword: string;
  notificationType: AdminNotificationType | undefined;
  isRead: boolean | undefined;
  onSearch: (keyword: string) => void;
  onTypeChange: (type: AdminNotificationType | undefined) => void;
  onReadChange: (isRead: boolean | undefined) => void;
  onResetFilters?: () => void;
}

export default function NotificationToolbar({
  keyword,
  notificationType,
  isRead,
  onSearch,
  onTypeChange,
  onReadChange,
  onResetFilters,
}: Props) {
  const [search, setSearch] = useState(keyword);

  // Sync state nội bộ khi prop keyword thay đổi từ bên ngoài (ví dụ: Reset filter)
  useEffect(() => {
    setSearch(keyword);
  }, [keyword]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== keyword) {
        onSearch(search);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [search, keyword, onSearch]);

  const handleClearSearch = () => {
    setSearch("");
    onSearch("");
  };

  const hasActiveFilters =
    search.trim() !== "" ||
    notificationType !== undefined ||
    isRead !== undefined;

  const handleReset = () => {
    setSearch("");
    onSearch("");
    onTypeChange(undefined);
    onReadChange(undefined);
    if (onResetFilters) {
      onResetFilters();
    }
  };

  return (
    <div className={styles.toolbar}>
      <div className={styles.filtersGroup}>
        {/* Search Input Box */}
        <div className={styles.searchWrapper}>
          <Search size={16} className={styles.searchIcon} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tiêu đề, nội dung, khách hàng..."
            className={styles.searchInput}
          />
          {search && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={handleClearSearch}
              title="Xóa từ khóa"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Notification Type Filter */}
        <div className={styles.selectWrapper}>
          <select
            value={notificationType || ""}
            onChange={(e) =>
              onTypeChange(
                e.target.value
                  ? (e.target.value as AdminNotificationType)
                  : undefined,
              )
            }
            className={styles.select}
          >
            <option value="">Tất cả loại thông báo</option>
            <option value="BOOKING">Đặt vé</option>
            <option value="PAYMENT">Thanh toán</option>
            <option value="TRIP">Chuyến xe</option>
          </select>
        </div>

        {/* Read Status Filter */}
        <div className={styles.selectWrapper}>
          <select
            value={isRead === undefined ? "" : isRead ? "true" : "false"}
            onChange={(e) => {
              const value = e.target.value;
              onReadChange(value === "" ? undefined : value === "true");
            }}
            className={styles.select}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="false">Chưa đọc</option>
            <option value="true">Đã đọc</option>
          </select>
        </div>
      </div>

      {/* Reset Filter Action */}
      {hasActiveFilters && (
        <button
          type="button"
          className={styles.resetBtn}
          onClick={handleReset}
          title="Đặt lại tất cả bộ lọc"
        >
          <RotateCcw size={14} />
          <span>Xóa bộ lọc</span>
        </button>
      )}
    </div>
  );
}
